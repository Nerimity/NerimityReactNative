export default function Show<T>(props: {
  when: T | undefined | null | false;
  children: JSX.Element;
}) {
  if (!props.when) {
    return null;
  }
  return props.children;
}
