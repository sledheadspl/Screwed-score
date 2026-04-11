/// Moment detection engine.
/// Combines audio spike, chat velocity, alerts and keyword hits into a score.

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DetectionConfig {
    pub threshold: f32,           // 0–100, default 50
    pub audio_weight: f32,        // 0.0–1.0, default 0.3
    pub chat_weight: f32,         // 0.0–1.0, default 0.3
    pub pre_roll_seconds: u32,    // default 5
    pub post_roll_seconds: u32,   // default 10
    pub clip_length_max: u32,     // seconds, default 30
    pub cooldown_seconds: u32,    // default 60
    pub keywords: Vec<KeywordConfig>,
}

impl Default for DetectionConfig {
    fn default() -> Self {
        Self {
            threshold: 50.0,
            audio_weight: 0.3,
            chat_weight: 0.3,
            pre_roll_seconds: 5,
            post_roll_seconds: 10,
            clip_length_max: 30,
            cooldown_seconds: 60,
            keywords: vec![],
        }
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct KeywordConfig {
    pub word: String,
    pub points: f32,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct MomentEvent {
    pub timestamp: f64,     // seconds from stream start
    pub score: f32,
    pub audio_score: f32,
    pub chat_score: f32,
    pub alert_score: f32,
    pub keyword_score: f32,
    pub trigger_reason: String,
}

pub struct MomentDetector {
    config: DetectionConfig,
    audio_history: Vec<f32>,      // rolling RMS levels
    chat_history: Vec<u32>,       // messages per interval
    last_clip_at: Option<f64>,
}

impl MomentDetector {
    pub fn new(config: DetectionConfig) -> Self {
        Self {
            config,
            audio_history: Vec::with_capacity(600),
            chat_history: Vec::with_capacity(60),
            last_clip_at: None,
        }
    }

    pub fn push_audio_sample(&mut self, rms: f32) {
        self.audio_history.push(rms);
        if self.audio_history.len() > 600 {
            self.audio_history.remove(0);
        }
    }

    pub fn push_chat_count(&mut self, count: u32) {
        self.chat_history.push(count);
        if self.chat_history.len() > 60 {
            self.chat_history.remove(0);
        }
    }

    /// Returns a detected moment if the score exceeds threshold.
    pub fn evaluate(
        &mut self,
        timestamp: f64,
        current_audio: f32,
        current_chat: u32,
        alert_type: Option<&str>,
        message_text: Option<&str>,
    ) -> Option<MomentEvent> {
        // Cooldown check
        if let Some(last) = self.last_clip_at {
            if timestamp - last < self.config.cooldown_seconds as f64 {
                return None;
            }
        }

        // Audio spike score (0–100)
        let audio_score = self.compute_audio_score(current_audio);

        // Chat velocity score (0–100)
        let chat_score = self.compute_chat_score(current_chat);

        // Alert points
        let alert_score = match alert_type {
            Some("raid") => 50.0,
            Some("donation") => 30.0,
            Some("subscription") => 20.0,
            Some("bits") => 15.0,
            _ => 0.0,
        };

        // Keyword score
        let keyword_score = if let Some(text) = message_text {
            self.compute_keyword_score(text)
        } else {
            0.0
        };

        let total_score = audio_score * self.config.audio_weight
            + chat_score * self.config.chat_weight
            + alert_score
            + keyword_score;

        if total_score >= self.config.threshold {
            self.last_clip_at = Some(timestamp);

            let reason = if alert_score > 0.0 {
                format!("alert:{}", alert_type.unwrap_or("unknown"))
            } else if keyword_score > 0.0 {
                "keyword_match".to_string()
            } else if audio_score > chat_score {
                "audio_spike".to_string()
            } else {
                "chat_spike".to_string()
            };

            Some(MomentEvent {
                timestamp,
                score: total_score,
                audio_score,
                chat_score,
                alert_score,
                keyword_score,
                trigger_reason: reason,
            })
        } else {
            None
        }
    }

    fn compute_audio_score(&self, current: f32) -> f32 {
        if self.audio_history.is_empty() {
            return 0.0;
        }
        let avg: f32 = self.audio_history.iter().sum::<f32>() / self.audio_history.len() as f32;
        if avg == 0.0 {
            return 0.0;
        }
        let ratio = current / avg;
        // ratio of 2.0 = score 50, ratio of 4.0 = score 100
        ((ratio - 1.0) * 33.3).clamp(0.0, 100.0)
    }

    fn compute_chat_score(&self, current: u32) -> f32 {
        if self.chat_history.is_empty() {
            return 0.0;
        }
        let avg: f32 = self.chat_history.iter().sum::<u32>() as f32
            / self.chat_history.len() as f32;
        if avg == 0.0 {
            return 0.0;
        }
        let multiplier = current as f32 / avg;
        // 3x baseline = 66 points, 5x = 100
        ((multiplier - 1.0) * 25.0).clamp(0.0, 100.0)
    }

    fn compute_keyword_score(&self, text: &str) -> f32 {
        let text_lower = text.to_lowercase();
        self.config
            .keywords
            .iter()
            .filter(|kw| text_lower.contains(&kw.word.to_lowercase()))
            .map(|kw| kw.points)
            .sum()
    }
}
