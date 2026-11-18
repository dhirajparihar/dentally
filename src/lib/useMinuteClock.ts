"use client";

import { useEffect, useState } from "react";

export function useMinuteClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(new Date());
      timer = setTimeout(tick, 60_000 - Date.now() % 60_000);
    };
    tick();
    return () => clearTimeout(timer);
  }, []);

  return now;
}
