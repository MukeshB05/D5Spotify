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

const decodeText = (value) => {
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
    return image.url || image.link || image.src || "";
  }

  return "";
};

const Navbar = () => {
  const { playMusic } = useContext(MusicContext) || {};
  const navigate = useNavigate();

  const searchRef = useRef(null);
  const requestRef = useRef(0);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  /* =====================================================
     GREETING
  ====================================================== */

  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return "Good Morning";
    }

    if (hour < 18) {
      return "Good Afternoon";
    }

    if (hour < 21) {
      return "Good Evening";
    }

    return "Good Night";
  };

  /* =====================================================
     SEARCH SUGGESTIONS
  ====================================================== */

  useEffect(() => {
    const searchValue = query.trim();

    if (!searchValue) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const requestId = ++requestRef.current;

    const timer = setTimeout(async () => {
      setLoading(true);

      try {
        const [search, songs, artists] =
          await Promise.all([
            getSearchData(searchValue),
            getSongbyQuery(searchValue, 5),
            getArtistbyQuery(searchValue, 5),
          ]);

        if (requestId !== requestRef.current) {
          return;
        }

        const results = [];

        /* SONGS */

        if (Array.isArray(songs?.data?.results)) {
          results.push(
            ...songs.data.results
              .filter((item) => item?.id)
              .map((item) => ({
                type: "Song",
                id: item.id,
                name: decodeText(item.name),
                duration: item.duration || 0,
                artist:
                  item.artists ||
                  item.artist ||
                  "",
                image: getImage(item.image),
                downloadUrl:
                  item.downloadUrl?.[4]?.url ||
                  item.downloadUrl?.[3]?.url ||
                  item.downloadUrl?.[2]?.url ||
                  item.downloadUrl?.[0]?.url ||
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
              .filter((item) => item?.id)
              .map((item) => ({
                type: "Album",
                id: item.id,
                name: decodeText(
                  item.title || item.name
                ),
                artist:
                  item.artist ||
                  item.artists ||
                  "",
                image: getImage(item.image),
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
              .filter((item) => item?.id)
              .map((item) => ({
                type: "Playlist",
                id: item.id,
                name: decodeText(
                  item.title || item.name
                ),
                image: getImage(item.image),
              }))
          );
        }

        /* ARTISTS */

        if (Array.isArray(artists?.data?.results)) {
          results.push(
            ...artists.data.results
              .filter((item) => item?.id)
              .map((item) => ({
                type: "Artist",
                id: item.id,
                name: decodeText(item.name),
                image: getImage(item.image),
              }))
          );
        }

        /* REMOVE DUPLICATES */

        const uniqueResults = Array.from(
          new Map(
            results.map((item) => [
              `${item.type}-${item.id}`,
              item,
            ])
          ).values()
        );

        setSuggestions(uniqueResults);
      } catch (error) {
        console.error(
          "Search suggestion error:",
          error
        );

        setSuggestions([]);
      } finally {
        if (requestId === requestRef.current) {
          setLoading(false);
        }
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  /* =====================================================
     OUTSIDE CLICK
  ====================================================== */

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target)
      ) {
        setSuggestions([]);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  /* =====================================================
     SEARCH
  ====================================================== */

  const handleSearchSubmit = (event) => {
    event.preventDefault();

    const searchTerm = query.trim();

    if (!searchTerm) {
      return;
    }

    setSuggestions([]);

    navigate(
      `/search/${encodeURIComponent(searchTerm)}`
    );
  };

  /* =====================================================
     SUGGESTION CLICK
  ====================================================== */

  const handleSuggestionClick = async (suggestion) => {
    setQuery("");
    setSuggestions([]);

    if (suggestion.type === "Song") {
      if (typeof playMusic !== "function") {
        return;
      }

      try {
        const response = await getSuggestionSong(
          suggestion.id
        );

        const suggestedSongs = Array.isArray(
          response?.data
        )
          ? response.data
          : [];

        const queue = [
          suggestion,
          ...suggestedSongs,
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

    if (suggestion.type === "Album") {
      navigate(`/albums/${suggestion.id}`);
      return;
    }

    if (suggestion.type === "Artist") {
      navigate(`/artists/${suggestion.id}`);
      return;
    }

    if (suggestion.type === "Playlist") {
      navigate(`/playlists/${suggestion.id}`);
    }
  };

  return (
    <header
      className="
        fixed
        top-0
        left-0
        right-0
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
          w-full
          max-w-[1600px]
          px-2
          sm:px-4
          lg:px-5
        "
      >
        {/* =================================================
            MOBILE / TABLET TOP ROW
        ================================================== */}

        <div
          className="
            flex
            h-[58px]
            items-center
            gap-3
            lg:h-[72px]
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

          {/* GREETING */}

          <div
            className="
              min-w-0
              flex-1
              truncate
              text-base
              font-semibold
              sm:text-lg
              lg:hidden
            "
          >
            {getGreeting()}
          </div>

          {/* DESKTOP NAVIGATION */}

          <div
            className="
              hidden
              items-center
              gap-7
              lg:flex
            "
          >
            <Link
              to="/Playlist"
              className="
                font-semibold
                transition-opacity
                hover:opacity-60
              "
            >
              Playlist
            </Link>

            <Link
              to="/Favourite"
              className="
                font-semibold
                transition-opacity
                hover:opacity-60
              "
            >
              Favourite
            </Link>
          </div>

          {/* DESKTOP SEARCH */}

          <div
            ref={searchRef}
            className="
              relative
              hidden
              w-full
              max-w-[650px]
              flex-1
              lg:block
            "
          >
            <SearchBox
              query={query}
              setQuery={setQuery}
              onSubmit={handleSearchSubmit}
            />

            <SuggestionBox
              loading={loading}
              suggestions={suggestions}
              onClick={handleSuggestionClick}
            />
          </div>

          {/* THEME */}

          <div className="shrink-0">
            <Theme />
          </div>
        </div>

        {/* =================================================
            MOBILE SEARCH ROW
        ================================================== */}

        <div
          ref={searchRef}
          className="
            relative
            pb-2
            lg:hidden
          "
        >
          <SearchBox
            query={query}
            setQuery={setQuery}
            onSubmit={handleSearchSubmit}
          />

          <SuggestionBox
            loading={loading}
            suggestions={suggestions}
            onClick={handleSuggestionClick}
          />
        </div>
      </div>
    </header>
  );
};

/* =====================================================
   SEARCH BOX
====================================================== */

const SearchBox = ({
  query,
  setQuery,
  onSubmit,
}) => {
  return (
    <form onSubmit={onSubmit}>
      <div
        className="
          flex
          h-11
          w-full
          overflow-hidden
          rounded-xl
          border
          border-black/10
          bg-black/5
          focus-within:border-blue-500/40
          focus-within:ring-2
          focus-within:ring-blue-500/10
          dark:border-white/10
          dark:bg-white/5
        "
      >
        <div
          className="
            flex
            w-10
            shrink-0
            items-center
            justify-center
            opacity-60
          "
        >
          <IoSearchOutline className="text-xl" />
        </div>

        <input
          type="search"
          value={query}
          onChange={(event) =>
            setQuery(event.target.value)
          }
          placeholder="Search music"
          className="
            min-w-0
            flex-1
            bg-transparent
            px-1
            text-sm
            outline-none
            placeholder:opacity-50
            sm:text-base
          "
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
        />

        <button
          type="submit"
          className="
            flex
            h-full
            w-11
            shrink-0
            items-center
            justify-center
            transition
            hover:bg-black/5
            active:scale-95
            dark:hover:bg-white/10
          "
          aria-label="Search"
        >
          <IoSearchOutline className="text-2xl" />
        </button>
      </div>
    </form>
  );
};

/* =====================================================
   SUGGESTIONS
====================================================== */

const SuggestionBox = ({
  loading,
  suggestions,
  onClick,
}) => {
  if (!loading && suggestions.length === 0) {
    return null;
  }

  return (
    <div
      className="
        absolute
        left-0
        right-0
        top-[calc(100%+4px)]
        z-[1000]
        max-h-[55vh]
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
          {suggestions.map((suggestion) => (
            <button
              key={`${suggestion.type}-${suggestion.id}`}
              type="button"
              onClick={() => onClick(suggestion)}
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
              {suggestion.image ? (
                <img
                  src={suggestion.image}
                  alt=""
                  className="
                    h-11
                    w-11
                    shrink-0
                    rounded-lg
                    object-cover
                  "
                  loading="lazy"
                />
              ) : (
                <div
                  className="
                    h-11
                    w-11
                    shrink-0
                    rounded-lg
                    bg-black/10
                    dark:bg-white/10
                  "
                />
              )}

              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {suggestion.name}
                </p>

                <p className="text-xs opacity-50">
                  {suggestion.type}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Navbar;
