import heapq
from typing import List, Tuple, Dict, Any, Optional
from uuid import UUID
from app.core.uow import UnitOfWork
from app.models.map import MapLocation, MapPath, LocationType
from app.schemas.map import (
    MapLocationCreate, MapLocationUpdate,
    MapPathCreate, RouteResponse, RouteStep
)

class MapService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def create_location(self, loc_in: MapLocationCreate) -> MapLocation:
        async with self.uow.transaction() as u:
            if await u.map_locations.get_by_code(loc_in.code):
                raise ValueError(f"Location code '{loc_in.code}' already exists.")

            loc = MapLocation(
                code=loc_in.code.upper(),
                name=loc_in.name,
                type=loc_in.type,
                parent_id=loc_in.parent_id,
                floor=loc_in.floor,
                latitude=loc_in.latitude,
                longitude=loc_in.longitude,
                geometry=loc_in.geometry,
                description=loc_in.description,
                image_url=loc_in.image_url,
                is_public=loc_in.is_public,
                status=loc_in.status
            )
            return await u.map_locations.create(loc)

    async def update_location(self, loc_id: UUID, loc_in: MapLocationUpdate) -> MapLocation:
        async with self.uow.transaction() as u:
            loc = await u.map_locations.get_by_id(loc_id)
            if not loc:
                raise ValueError("Map location not found.")
            return await u.map_locations.update(loc, loc_in.model_dump(exclude_unset=True))

    async def list_locations(
        self,
        location_type: Optional[LocationType] = None,
        floor: Optional[int] = None,
        parent_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[MapLocation], int]:
        async with self.uow.transaction() as u:
            return await u.map_locations.list_locations(
                location_type=location_type,
                floor=floor,
                parent_id=parent_id,
                skip=skip,
                limit=limit
            )

    async def create_path(self, path_in: MapPathCreate) -> MapPath:
        async with self.uow.transaction() as u:
            if not await u.map_locations.get_by_id(path_in.from_location_id):
                raise ValueError("Source location not found.")
            if not await u.map_locations.get_by_id(path_in.to_location_id):
                raise ValueError("Destination location not found.")

            path = MapPath(
                from_location_id=path_in.from_location_id,
                to_location_id=path_in.to_location_id,
                distance_m=path_in.distance_m or 10.0,
                path_geojson=path_in.path_geojson,
                accessible=path_in.accessible
            )
            return await u.map_paths.create(path)

    async def calculate_shortest_path(self, from_id: UUID, to_id: UUID) -> RouteResponse:
        async with self.uow.transaction() as u:
            src = await u.map_locations.get_by_id(from_id)
            dest = await u.map_locations.get_by_id(to_id)
            if not src or not dest:
                raise ValueError("Source or destination map location not found.")

            # Load graph paths
            paths = await u.map_paths.get_all_accessible_paths()

            # Build adjacency list: node -> list of (neighbor_id, distance)
            adj: Dict[UUID, List[Tuple[UUID, float]]] = {}
            for p in paths:
                dist = p.distance_m if p.distance_m else 10.0
                if p.from_location_id not in adj:
                    adj[p.from_location_id] = []
                if p.to_location_id not in adj:
                    adj[p.to_location_id] = []

                adj[p.from_location_id].append((p.to_location_id, dist))
                adj[p.to_location_id].append((p.from_location_id, dist)) # Bidirectional

            # Dijkstra Algorithm
            distances: Dict[UUID, float] = {from_id: 0.0}
            previous: Dict[UUID, Optional[UUID]] = {from_id: None}
            pq = [(0.0, from_id)]

            found = False
            while pq:
                current_dist, u_id = heapq.heappop(pq)

                if u_id == to_id:
                    found = True
                    break

                if current_dist > distances.get(u_id, float('inf')):
                    continue

                for neighbor_id, weight in adj.get(u_id, []):
                    distance = current_dist + weight
                    if distance < distances.get(neighbor_id, float('inf')):
                        distances[neighbor_id] = distance
                        previous[neighbor_id] = u_id
                        heapq.heappush(pq, (distance, neighbor_id))

            if not found:
                return RouteResponse(
                    found=False,
                    total_distance_m=0.0,
                    steps=[],
                    message="No accessible walking route found between locations."
                )

            # Reconstruct path
            path_ids = []
            curr: Optional[UUID] = to_id
            while curr is not None:
                path_ids.append(curr)
                curr = previous.get(curr)

            path_ids.reverse()

            # Map to RouteStep objects
            steps = []
            for node_id in path_ids:
                loc_obj = await u.map_locations.get_by_id(node_id)
                if loc_obj:
                    steps.append(RouteStep(
                        location_id=loc_obj.id,
                        name=loc_obj.name,
                        type=loc_obj.type,
                        floor=loc_obj.floor
                    ))

            total_dist = round(distances[to_id], 1)
            return RouteResponse(
                found=True,
                total_distance_m=total_dist,
                steps=steps,
                message=f"Walking route found ({total_dist} meters, {len(steps)} steps)."
            )
