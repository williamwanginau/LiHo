import { avatarUrlFromUser, stableBgHexFromSeed } from "./avatarUtils";

function Avatar({ user, size = 40, style = "identicon", alt, iconRatio = 0.68, bgColor }) {
  const seed = user?.id || user?.clientId || user?.externalId || "anon";
  const innerSize = Math.max(1, Math.round(size * iconRatio));
  const src = avatarUrlFromUser(user, { size: innerSize, style });
  const label = alt ?? (user?.nickname || user?.username || "avatar");
  const bg = bgColor || stableBgHexFromSeed(seed);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: bg,
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
      }}
      title={label}
    >
      <img
        src={src}
        alt={label}
        width={innerSize}
        height={innerSize}
        style={{ objectFit: "contain", display: "block" }}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={(e) => {
          // Fallback to identicon if current style fails
          e.currentTarget.src = avatarUrlFromUser(user, { size: innerSize, style: "identicon" });
        }}
      />
    </div>
  );
}

export default Avatar;
