import { NavLink } from "react-router-dom";

import {
  IoHomeOutline,
  IoHome,
  IoHeartOutline,
  IoHeart,
  IoMusicalNotesOutline,
  IoMusicalNotes,
  IoTvOutline,
  IoTv,
} from "react-icons/io5";

import { FaSpotify } from "react-icons/fa";

const Navigator = () => {
  const navigation = [
    {
      name: "Home",
      path: "/",
      icon: IoHomeOutline,
      activeIcon: IoHome,
    },
    {
      name: "Playlist",
      path: "/Playlist",
      icon: IoMusicalNotesOutline,
      activeIcon: IoMusicalNotes,
    },
    {
      name: "Favourite",
      path: "/Favourite",
      icon: IoHeartOutline,
      activeIcon: IoHeart,
    },
    {
      name: "Spotify",
      path: "/Spotify",
      icon: FaSpotify,
      activeIcon: FaSpotify,
    },
    {
      name: "Live TV",
      path: "/LiveTV",
      icon: IoTvOutline,
      activeIcon: IoTv,
    },
  ];

  return (
    <nav
      className="
        fixed
        bottom-0
        left-0
        right-0
        z-[1000]
        w-full
        border-t
        border-black/10
        bg-white/95
        shadow-[0_-8px_30px_rgba(0,0,0,0.08)]
        backdrop-blur-xl
        dark:border-white/10
        dark:bg-[#0b0b0b]/95
        supports-[padding:max(0px)]:pb-[env(safe-area-inset-bottom)]
      "
      aria-label="Bottom navigation"
    >
      <div
        className="
          mx-auto
          grid
          h-[68px]
          w-full
          max-w-3xl
          grid-cols-5
          items-stretch
          px-1
          sm:h-[72px]
          sm:px-2
        "
      >
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              `
                group
                relative
                flex
                min-w-0
                flex-col
                items-center
                justify-center
                gap-0.5
                rounded-xl
                px-1
                text-[10px]
                font-medium
                transition-all
                duration-200
                sm:text-xs
                ${
                  isActive
                    ? "text-[#1DB954]"
                    : "text-black/60 dark:text-white/60"
                }
              `
            }
          >
            {({ isActive }) => {
              const Icon = isActive
                ? item.activeIcon
                : item.icon;

              return (
                <>
                  {/* Active indicator */}
                  <span
                    className={`
                      absolute
                      top-0
                      h-[3px]
                      w-8
                      rounded-b-full
                      bg-[#1DB954]
                      transition-all
                      duration-200
                      ${
                        isActive
                          ? "scale-100 opacity-100"
                          : "scale-50 opacity-0"
                      }
                    `}
                  />

                  <span
                    className={`
                      flex
                      h-9
                      w-12
                      items-center
                      justify-center
                      rounded-xl
                      transition-all
                      duration-200
                      ${
                        isActive
                          ? "bg-[#1DB954]/10"
                          : "group-hover:bg-black/5 dark:group-hover:bg-white/10"
                      }
                    `}
                  >
                    <Icon
                      className={`
                        text-[25px]
                        transition-transform
                        duration-200
                        sm:text-[27px]
                        ${
                          isActive
                            ? "scale-110"
                            : "scale-100"
                        }
                      `}
                    />
                  </span>

                  <span className="max-w-full truncate leading-4">
                    {item.name}
                  </span>
                </>
              );
            }}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default Navigator;
