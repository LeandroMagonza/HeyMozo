import { useEffect } from "react";

export function useHeaderScroll() {
  useEffect(() => {
    let lastScroll = 0;
    const header = document.querySelector(".fixed-header");

    const handleScroll = () => {
      const currentScroll = window.pageYOffset;

      if (currentScroll > lastScroll && currentScroll > 200) {
        // Scrolling down
        header.classList.remove("visible");
      } else {
        // Scrolling up
        header.classList.add("visible");
      }

      lastScroll = currentScroll;
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
}
