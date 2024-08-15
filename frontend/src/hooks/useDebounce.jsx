export default function useDebounce(f, delay) {
  let timeoutId;
  const debouncedFunction = (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => f(...args), delay);
  };

  return debouncedFunction;
}
