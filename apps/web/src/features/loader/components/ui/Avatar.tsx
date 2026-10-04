interface AvatarProps {
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg";
}
const SIZES = {
  sm: "h-10 w-10 text-sm",
  md: "h-11 w-11 text-sm",
  lg: "h-12 w-12 text-base",
};
export function Avatar({ name, src, size = "md" }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={`${SIZES[size]} shrink-0 rounded-full bg-amber-pale object-cover`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${SIZES[size]} grid shrink-0 place-items-center rounded-full bg-brand-pale font-semibold text-forest`}
    >
      {initials}
    </span>
  );
}
