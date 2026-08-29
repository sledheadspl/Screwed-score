from app.ingestion.states.idaho import IDBusinessEntityAdapter, IDUnclaimedPropertyAdapter
from app.ingestion.states.montana import MTBusinessEntityAdapter, MTUnclaimedPropertyAdapter
from app.ingestion.states.oregon import ORBusinessEntityAdapter, ORUnclaimedPropertyAdapter
from app.ingestion.states.washington import WABusinessEntityAdapter, WAUnclaimedPropertyAdapter

# Registry used by the seed script and (later) a scheduler. Adding a new
# state means writing its adapter module and adding it here.
UNCLAIMED_PROPERTY_ADAPTERS = [
    WAUnclaimedPropertyAdapter(),
    IDUnclaimedPropertyAdapter(),
    ORUnclaimedPropertyAdapter(),
    MTUnclaimedPropertyAdapter(),
]

BUSINESS_ENTITY_ADAPTERS = [
    WABusinessEntityAdapter(),
    IDBusinessEntityAdapter(),
    ORBusinessEntityAdapter(),
    MTBusinessEntityAdapter(),
]
