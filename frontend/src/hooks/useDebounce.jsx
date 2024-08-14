export default function useDebounce(f, delay) {
  let timeoutId;
  const debouncedFunction = (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      console.log("running");
      f(...args);
    }, delay);
  };

  return debouncedFunction;
}
