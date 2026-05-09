export const RESPONSES = {
  SPAM_WARNING:
    "Friendly reminder Chat: Please don't spam multiple messages in chat. Thank you 🙏",

  LANGUAGE_WARNING:
    "Chat just another friendly reminder — let's keep the chat clean and clear of any foul language. This is a family friendly stream. Thank you for understanding. 🙏",

  SHIPS_WORLDWIDE:
    "Yes, we do ship worldwide. 🌍",

  CARD_PRICE:
    "Are you curious about the price of a card? Head on over to the Collectr app or TCG for your price reference. Thank you",

  PACK_PRICE:
    "Are you curious about the price of a pack/order? Head on over to the shop http://www.poke-bank.com",

  HOW_IT_WORKS:
    "Curious how this works? You place an order for cards on our website, we then place you into a live queue (times vary). Orders are opened live and then shipped to your address.",

  SHIPPING_TIME:
    "How long will it take to receive my cards? You can expect roughly 3–5 days in the US and 7–10 days overseas. (times may vary)",

  HOW_TO_ORDER:
    "Looking to place an order but don't know how? Head on over to our website at http://www.poke-bank.com and get your packs there.",

  QUEUE_INFO:
    "Reminder: once you place an order you will be placed into a queue (times vary) and your orders will be ripped accordingly.",

  PRICE_DEFENSE:
    "Disagree with the price? Feel free to shop around. When you purchase with us you buy the experience and the community — that is second to none. 💪",

  PACK_SOURCE:
    "Curious how we get our packs? This is a Shop/LLC — we receive our products from distribution.",

  SUPPORT:
    "Have an issue? Please reach out to support@poke-bank.com. Response times vary due to volume of emails and limited staff. Expect a response within 1–3 days.",

  NO_FREE_PACKS:
    "Friendly Reminder CHAT: No free packs are available here. But you can go to TikTok and enter there (US only — their rules, not ours), or alternatively Discord for a weekly worldwide giveaway.",

  PERSONAL_INFO:
    "Chat: For safety of all users we request that you do not ask other people for personal information. Thank you for understanding. 🙏",

  CLOVERS:
    "Chat you heard the man CLOVERS IN 🍀🍀🍀🍀🍀🍀🍀🍀🍀🍀🍀🍀🍀🍀🍀🍀🍀🍀🍀🍀🍀🍀🍀🍀",
} as const;

export type ResponseKey = keyof typeof RESPONSES;
