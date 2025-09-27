const { createUsersRepo } = require("./usersRepo");

function seedFriends() {
  return {
    1234567890: ["1234567891", "1234567892"],
    1234567891: ["1234567890", "1234567892"],
    1234567892: ["1234567890", "1234567891"],
  };
}

function createFriendsRepo({ seed = true } = {}) {
  const friends = seed ? seedFriends() : {};

  function getFriendsByExternalId(externalId) {
    return friends[externalId] || [];
  }

  function listFriendsByExternalId(externalId) {
    console.log("externalId", externalId);
    const ids = new Set(getFriendsByExternalId(externalId));
    const all = createUsersRepo({ seed: true }).getUsers();
    return all.filter((u) => ids.has(u.externalId));
  }

  return {
    getFriendsByExternalId,
    listFriendsByExternalId,
  };
}

module.exports = { createFriendsRepo };
