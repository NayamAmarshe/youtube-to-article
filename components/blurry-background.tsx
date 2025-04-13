export function BlurryBackground() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      id="background"
      src="/background.svg"
      alt=""
      className="fixed object-cover top-0 left-0 w-full h-full -z-[1] blur-[100px] opacity-30"
    />
  );
}
