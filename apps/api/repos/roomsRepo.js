function seedRooms() {
  return [
    { id: "1234567890", slug: "room1", name: "Room 1" },
    { id: "9876543210", slug: "room2", name: "Room 2" },
    { id: "4567890123", slug: "room3", name: "Room 3" },
  ];
}

function createRoomsRepo({ seed = true } = {}) {
  const rooms = seed ? seedRooms() : [];

  function getRooms() {
    return rooms.slice();
  }

  return {
    getRooms,
  };
}

module.exports = { createRoomsRepo };
