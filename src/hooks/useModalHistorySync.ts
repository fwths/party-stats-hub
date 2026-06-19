import { useEffect, useRef } from "react";

export function useModalHistorySync(
  isOpen: boolean,
  setIsOpen: (open: boolean) => void,
  stateKey: string,
  condition: boolean = true,
) {
  const pushedStateRef = useRef<boolean>(false);
  const setIsOpenRef = useRef(setIsOpen);
  setIsOpenRef.current = setIsOpen;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!condition) return;

    const handlePopState = (_event: PopStateEvent) => {
      if (pushedStateRef.current) {
        pushedStateRef.current = false;
        setIsOpenRef.current(false);
      }
    };

    window.addEventListener("popstate", handlePopState);

    if (isOpen) {
      if (!pushedStateRef.current) {
        window.history.pushState({ [stateKey]: true }, "");
        pushedStateRef.current = true;
      }
    } else {
      if (pushedStateRef.current) {
        pushedStateRef.current = false;
        window.history.back();
      }
    }

    return () => {
      window.removeEventListener("popstate", handlePopState);
      // Clean up history state if unmounting while the modal is open, but only if we haven't navigated away
      if (pushedStateRef.current && window.history.state?.[stateKey]) {
        pushedStateRef.current = false;
        window.history.back();
      }
    };
  }, [isOpen, condition, stateKey]);
}
