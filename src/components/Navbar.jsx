import { Link, useNavigate } from "react-router-dom";
import {
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getArtistbyQuery,
  getSearchData,
  getSongbyQuery,
  getSuggestionSong,
} from "../../fetch";

import MusicContext from "../context/MusicContext";
import Theme from "../../theme";

import he from "he";
import { IoSearchOutline } from "react-icons/io5";

const decode = (value) => {
  try {
    return he.decode(String(value ?? ""));
  } catch {
    return String(value ?? "");
  }
};

const getImage = (image) => {
  if (Array.isArray(image)) {
    for (let i = image.length - 1; i >= 0; i--) {
      const item = image[i];

      if (typeof item === "string" && item) {
        return item;
      }

      if (item?.url) return item.url;
      if (item?.link) return item.link;
      if (item?.src) return item.src;
    }
  }

  if (typeof image === "string") {
    return image;
  }

  if (image && typeof image === "object") {
    return (
      image.url ||
      image.link ||
      image.src ||
      ""
    );
  }

  return "";
};

const Navbar = () => {
  const { playMusic } =
    useContext(MusicContext) || {};

  const navigate = useNavigate();

  const searchRef = useRef(null);
  const requestRef = useRef(0);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  /* =====================================================
     SEARCH
  ====================================================== */

  useEffect(() => {
    const value = query.trim();

    if (!value) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const requestId =
      ++requestRef.current;

    const timer = setTimeout(async () => {
      setLoading(true);

      try {
        const [
          search,
          songs,
          artists,
        ] = await Promise.all([
          getSearchData(value),
          getSongbyQuery(value, 5),
          getArtistbyQuery(value, 5),
        ]);

        if (
          requestId !==
          requestRef.current
        ) {
          return;
        }

        const results = [];

        /* SONGS */

        if (
          Array.isArray(
            songs?.data?.results
          )
        ) {
          results.push(
            ...songs.data.results
              .filter(
                (item) => item?.id
              )
              .map((item) => ({
                type: "Song",
                id: item.id,
                name: decode(item.name),
                duration:
                  item.duration || 0,
                artist:
                  item.artists ||
                  item.artist ||
                  "",
                image: getImage(
                  item.image
                ),
                downloadUrl:
                  item.downloadUrl?.[4]
                    ?.url ||
                  item.downloadUrl?.[3]
                    ?.url ||
                  item.downloadUrl?.[2]
                    ?.url ||
                  item.downloadUrl?.[0]
                    ?.url ||
                  "",
              }))
          );
        }

        /* ALBUMS */

        if (
          Array.isArray(
            search?.data?.albums?.results
          )
        ) {
          results.push(
            ...search.data.albums.results
              .filter(
                (item) => item?.id
              )
              .map((item) => ({
                type: "Album",
                id: item.id,
                name: decode(
                  item.title ||
                    item.name
                ),
                artist:
                  item.artist ||
                  item.artists ||
                  "",
                image: getImage(
                  item.image
                ),
              }))
          );
        }

        /* PLAYLISTS */

        if (
          Array.isArray(
            search?.data?.playlists?.results
          )
        ) {
          results.push(
            ...search.data.playlists.results
              .filter(
                (item) => item?.id
              )
              .map((item) => ({
                type: "Playlist",
                id: item.id,
                name: decode(
                  item.title ||
                    item.name
                ),
                image: getImage(
                  item.image
                ),
              }))
          );
        }

        /* ARTISTS */

        if (
          Array.isArray(
            artists?.data?.results
          )
        ) {
          results.push(
            ...artists.data.results
              .filter(
                (item) => item?.id
              )
              .map((item) => ({
                type: "Artist",
                id: item.id,
                name: decode(
                  item.name
                ),
                image: getImage(
                  item.image
                ),
              }))
          );
        }

        /* REMOVE DUPLICATES */

        const unique =
          Array.from(
            new Map(
              results.map(
                (item) => [
                  `${item.type}-${item.id}`,
                  item,
                ]
              )
            ).values()
          );

        setSuggestions(unique);
      } catch (error) {
        console.error(
          "Navbar search error:",
          error
        );

        setSuggestions([]);
      } finally {
        if (
          requestId ===
          requestRef.current
        ) {
          setLoading(false);
        }
      }
    }, 350);

    return () =>
      clearTimeout(timer);
  }, [query]);

  /* =====================================================
     OUTSIDE CLICK
  ====================================================== */

  useEffect(() => {
    const handler = (event) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(
          event.target
        )
      ) {
        setSuggestions([]);
      }
    };

    document.addEventListener(
      "mousedown",
      handler
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handler
      );
    };
  }, []);

  /* =====================================================
     SEARCH SUBMIT
  ====================================================== */

  const submitSearch = (event) => {
    event.preventDefault();

    const value = query.trim();

    if (!value) return;

    setSuggestions([]);

    navigate(
      `/search/${encodeURIComponent(
        value
      )}`
    );
  };

  /* =====================================================
     SUGGESTION CLICK
  ====================================================== */

  const clickSuggestion = async (
    suggestion
  ) => {
    setQuery("");
    setSuggestions([]);

    if (
      suggestion.type === "Song"
    ) {
      if (
        typeof playMusic !==
        "function"
      ) {
        return;
      }

      try {
        const response =
          await getSuggestionSong(
            suggestion.id
          );

        const queue = [
          suggestion,
          ...(Array.isArray(
            response?.data
          )
            ? response.data
            : []),
        ];

        playMusic(
          suggestion.downloadUrl,
          suggestion.name,
          suggestion.duration,
          suggestion.image,
          suggestion.id,
          suggestion.artist,
          queue
        );
      } catch (error) {
        console.error(
          "Song playback error:",
          error
        );
      }

      return;
    }

    if (
      suggestion.type === "Album"
    ) {
      navigate(
        `/albums/${suggestion.id}`
      );
      return;
    }

    if (
      suggestion.type === "Artist"
    ) {
      navigate(
        `/artists/${suggestion.id}`
      );
      return;
    }

    if (
      suggestion.type === "Playlist"
    ) {
      navigate(
        `/playlists/${suggestion.id}`
      );
    }
  };

  return (
    <header
      className="
        fixed
        left-0
        right-0
        top-0
        z-[900]
        w-full
        border-b
        border-black/10
        bg-white/95
        shadow-sm
        backdrop-blur-xl
        dark:border-white/10
        dark:bg-[#0c0c0f]/95
      "
    >
      <div
        className="
          mx-auto
          flex
          h-[58px]
          w-full
          max-w-[1600px]
          items-center
          gap-2
          px-2
          sm:h-[64px]
          sm:px-4
          lg:h-[72px]
          lg:gap-5
          lg:px-5
        "
      >
        {/* LOGO */}

        <Link
          to="/"
          className="
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
          "
          aria-label="Home"
        >
          <span className="bg h-9 w-9" />
        </Link>

        {/* DESKTOP LINKS */}

        <div
          className="
            hidden
            shrink-0
            items-center
            gap-6
            lg:flex
          "
        >
          <Link
            to="/Playlist"
            className="
              text-base
              font-semibold
              hover:opacity-60
            "
          >
            Playlist
          </Link>

          <Link
            to="/Favourite"
            className="
              text-base
              font-semibold
              hover:opacity-60
            "
          >
            Favourite
          </Link>
        </div>

        {/* SEARCH */}

        <div
          ref={searchRef}
          className="
            relative
            min-w-0
            flex-1
            lg:ml-auto
            lg:max-w-[700px]
          "
        >
          <form
            onSubmit={submitSearch}
          >
            <div
              className="
                flex
                h-10
                overflow-hidden
                rounded-xl
                border
                border-black/10
                bg-black/5
                focus-within:ring-2
                focus-within:ring-blue-500/20
                dark:border-white/10
                dark:bg-white/5
                sm:h-11
              "
            >
              <input
                value={query}
                onChange={(event) =>
                  setQuery(
                    event.target.value
                  )
                }
                type="search"
                placeholder="Search songs, artists..."
                className="
                  min-w-0
                  flex-1
                  bg-transparent
                  px-3
                  text-sm
                  outline-none
                  placeholder:opacity-50
                  sm:px-4
                "
                autoComplete="off"
                spellCheck="false"
              />

              <button
                type="submit"
                className="
                  flex
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  hover:bg-black/5
                  dark:hover:bg-white/10
                "
                aria-label="Search"
              >
                <IoSearchOutline className="text-xl" />
              </button>
            </div>

            {/* SEARCH RESULTS */}

            {(loading ||
              suggestions.length > 0) && (
              <div
                className="
                  absolute
                  left-0
                  right-0
                  top-[calc(100%+7px)]
                  z-[1000]
                  max-h-[60vh]
                  overflow-y-auto
                  rounded-2xl
                  border
                  border-black/10
                  bg-white
                  p-2
                  shadow-2xl
                  dark:border-white/10
                  dark:bg-[#151515]
                "
              >
                {loading ? (
                  <div className="p-5 text-center text-sm opacity-60">
                    Searching...
                  </div>
                ) : (
                  <div
                    className="
                      grid
                      grid-cols-1
                      gap-1
                      sm:grid-cols-2
                      lg:grid-cols-3
                    "
                  >
                    {suggestions.map(
                      (item) => (
                        <button
                          key={`${item.type}-${item.id}`}
                          type="button"
                          onClick={() =>
                            clickSuggestion(
                              item
                            )
                          }
                          className="
                            flex
                            min-w-0
                            items-center
                            gap-3
                            rounded-xl
                            p-2
                            text-left
                            hover:bg-black/5
                            dark:hover:bg-white/10
                          "
                        >
                          {item.image ? (
                            <img
                              src={
                                item.image
                              }
                              alt=""
                              className="
                                h-11
                                w-11
                                shrink-0
                                rounded-lg
                                object-cover
                              "
                              onError={(
                                event
                              ) => {
                                event.currentTarget.src =
                                  "/Unknown.png";
                              }}
                            />
                          ) : (
                            <div className="h-11 w-11 shrink-0 rounded-lg bg-black/10 dark:bg-white/10" />
                          )}

                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {item.name}
                            </p>

                            <p className="text-xs opacity-50">
                              {item.type}
                            </p>
                          </div>
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* THEME */}

        <div className="shrink-0">
          <Theme />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
