function avatarUrl(
  seed,
  { size = 96, style = "identicon", format = "svg", backgroundType, backgroundColor } = {}
) {
  const base = `https://api.dicebear.com/7.x/${style}/${format}`;
  const params = new URLSearchParams();
  params.set("seed", String(seed || "anon"));
  params.set("size", String(size));
  if (backgroundType === "solid" || backgroundType === "gradientLinear") {
    params.set("backgroundType", backgroundType);
    if (backgroundColor) params.set("backgroundColor", String(backgroundColor));
  }
  return `${base}?${params.toString()}`;
}

function avatarUrlFromUser(user, opts) {
  if (!user) return avatarUrl("anonymous", opts);
  const seed =
    user.id ||
    user.clientId ||
    user.externalId ||
    user.username ||
    user.nickname ||
    "anonymous";
  return avatarUrl(seed, opts);
}

// Stable pastel palette for circular background
const PALETTE = [
  "b6e3f4",
  "c0aede",
  "d1d4f9",
  "ffd5dc",
  "ffdfbf",
  "e2f0cb",
  "c6f7e9",
  "fde68a",
  "fbcfe8",
  "e9d5ff",
];

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0; // 32-bit
  }
  return Math.abs(h);
}

function stableBgHexFromSeed(seed) {
  const idx = hashStr(String(seed || "anon")) % PALETTE.length;
  return `#${PALETTE[idx]}`;
}

export { avatarUrl, avatarUrlFromUser, stableBgHexFromSeed };
