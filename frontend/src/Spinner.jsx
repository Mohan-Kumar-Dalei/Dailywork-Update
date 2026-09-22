/** Button ke andar chhota loading circle. */
export default function Spinner({ big = false }) {
  return (
    <span
      aria-hidden="true"
      className={
        'inline-block rounded-full border-current border-r-transparent animate-spin opacity-80 ' +
        (big ? 'w-[26px] h-[26px] border-[3px]' : 'w-[13px] h-[13px] border-2')
      }
    />
  );
}
