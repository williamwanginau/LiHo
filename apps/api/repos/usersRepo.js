const crypto = require("crypto");

const nowIso = () => new Date().toISOString();

function seedUsers() {
  return [
    {
      id: crypto.randomUUID(),
      externalId: "1234567890",
      nickname: "Alice",
      createdAt: nowIso(),
      lastSeenAt: nowIso(),
    },
    {
      id: crypto.randomUUID(),
      externalId: "1234567891",
      nickname: "Bob",
      createdAt: nowIso(),
      lastSeenAt: nowIso(),
    },
    {
      id: crypto.randomUUID(),
      externalId: "1234567892",
      nickname: "Charlie",
      createdAt: nowIso(),
      lastSeenAt: nowIso(),
    },
  ];
}

function createUsersRepo({ seed = true } = {}) {
  const users = seed ? seedUsers() : [];

  function getUsers() {
    return users.slice();
  }

  function getUserByExternalId(externalId) {
    return (
      users.find((u) => String(u.externalId) === String(externalId)) || null
    );
  }

  return {
    getUsers,
    getUserByExternalId,
  };
}

module.exports = { createUsersRepo };
