import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { GoHome, GoHomeFill } from "react-icons/go";
import { IoHeartOutline, IoHeartSharp } from "react-icons/io5";
import { RiFolderMusicFill, RiFolderMusicLine } from "react-icons/ri";
import { MdLiveTv } from "react-icons/md";
import { FaSpotify } from "react-icons/fa";

const Navigator = () => {
  const location = useLocation();
  const [showTVModal, setShowTVModal] = useState(false);
  const [wakeLockStatus, setWakeLockStatus] = useState("Inactive");
  const wakeLockRef = useRef(null);

  const isHome = location.pathname === "/";
  const isPlaylist = /^\/(Playlist|playlist)$/.test(location.pathname);
  const isFavourite = /^\/(Favourite|favourite)$/.test(location.pathname);
  const isSpotify = location.pathname === "/spotify-import";

  const requestWakeLock = async () => {
    try {
      if (!("wakeLock" in navigator)) {
        setWakeLockStatus("Not Supported");
        return;
      }

      if (wakeLockRef.current) return;

      const lock = await navigator.wakeLock.request("screen");
      wakeLockRef.current = lock;
      setWakeLockStatus("Active");

      lock.addEventListener("release", () => {
        wakeLockRef.current = null;
        setWakeLockStatus("Inactive");
      });
    } catch (error) {
      console.error("Wake Lock request failed:", error);
      setWakeLockStatus("Failed");
    }
  };

  const releaseWakeLock = async () => {
    const lock = wakeLockRef.current;
    wakeLockRef.current = null;

    if (lock) {
      try {
        await lock.release();
      } catch (error) {
        console.warn("Wake Lock release failed:", error);
      }
    }

    setWakeLockStatus("Inactive");
  };

  const openTVModal = async () => {
    setShowTVModal(true);
    await requestWakeLock();
  };

  const closeTVModal = async () => {
    setShowTVModal(false);
    await releaseWakeLock();
  };

  useEffect(() => {
    const onVisibilityChange = async () => {
      if (document.visibilityState === "visible" && showTVModal) {
        await requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [showTVModal]);

  useEffect(() => {
    return () => {
      const lock = wakeLockRef.current;
      if (lock) {
        lock.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, []);

  const itemClass = (active) =>
    `flex h-full flex-1 min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-[11px] sm:text-xs transition-colors ${
      active ? "text-[#1DB954]" : "text-[var(--nav-text)]"
    }`;

  return (
    <>
      <nav
        className="Navigator fixed bottom-0 left-0 right-0 z-[80] lg:hidden h-[4.35rem] w-full border-t border-[var(--nav-border)] bg-[var(--navigator)] shadow-[0_-4px_18px_var(--nav-shadow)] backdrop-blur-xl"
        aria-label="Mobile navigation"
      >
        <div className="mx-auto flex h-full w-full max-w-xl items-stretch">
          <Link to="/" className={itemClass(isHome)} aria-label="Home">
            {isHome ? <GoHomeFill className="text-[1.65rem]" /> : <GoHome className="text-[1.65rem]" />}
            <span>Home</span>
          </Link>

          <Link to="/Playlist" className={itemClass(isPlaylist)} aria-label="Playlist">
            {isPlaylist ? <RiFolderMusicFill className="text-[1.65rem]" /> : <RiFolderMusicLine className="text-[1.65rem]" />}
            <span>Playlist</span>
          </Link>

          <Link to="/Favourite" className={itemClass(isFavourite)} aria-label="Favourite">
            {isFavourite ? <IoHeartSharp className="text-[1.65rem]" /> : <IoHeartOutline className="text-[1.65rem]" />}
            <span>Favourite</span>
          </Link>

          <Link to="/spotify-import" className={itemClass(isSpotify)} aria-label="Spotify Import">
            <FaSpotify className="text-[1.55rem]" />
            <span>Spotify</span>
          </Link>

          <button type="button" onClick={openTVModal} className={itemClass(false)} aria-label="Open Live TV">
            <MdLiveTv className="text-[1.7rem]" />
            <span>Live TV</span>
          </button>
        </div>
      </nav>

      {showTVModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-0 sm:p-4">
          <div className="relative h-full w-full max-w-5xl overflow-hidden bg-black sm:h-[88vh] sm:rounded-2xl sm:border sm:border-white/10">
            <button
              type="button"
              onClick={closeTVModal}
              className="absolute right-3 top-3 z-10 rounded-full bg-black/75 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
              aria-label="Close Live TV"
            >
              × Close
            </button>

            <iframe
              src="https://dreamplay.pages.dev/"
              title="Dreamly5 Live TV"
              className="h-full w-full border-0"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </>
  );
};

export default Navigator;
