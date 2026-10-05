import { Link, useNavigate } from "react-router-dom";
import { useState, useContext, useEffect, useRef } from "react";

import {
  getArtistbyQuery,
  getSearchData,
  getSongbyQuery,
  getSuggestionSong,
} from "../../fetch";

import MusicContext from "../context/MusicContext";
import he from "he";
import Theme from "../../theme";

import { IoSearchOutline } from "react-icons/io5";

const Navbar = () => {
  const { playMusic } = useContext(MusicContext);
  const navigate = useNavigate();

  const searchRef = useRef(null);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  /* =====================================================
     SAFE DECODE
  ====================================================== */

  const safeDecode = (value) => {
    try {
      return he.decode(String(value ?? ""));
    } catch {
      return String(value ?? "");
    }
  };

  /* =====================================================
     IMAGE
  ====================================================== */

  const getImage = (image) => {
    if (Array.isArray(image)) {
      for (let i = image.length - 1; i >= 0; i--) {
        const item = image[i];

        if (typeof item === "string" && item) {
          return item;
        }

        if (item?.url) {
          return item.url;
        }

        if (item?.link) {
          return item.link;
        }
      }
    }

    if (typeof image === "string") {
      return image;
    }

    if (image?.url) {
      return image.url;
    }

    return "";
  };

  /* =====================================================
     GREETING
  ====================================================== */

  const getGreeting = () => {
    const hours = new Date().getHours();

    if (hours < 12) {
      return "Good Morning";
    }

    if (hours < 18) {
      return "Good Afternoon";
    }

    if (hours < 21) {
      return "Good Evening";
    }

    return "Good Night";
  };

  /* =====================================================
     FETCH SEARCH SUGGESTIONS
  ====================================================== */

  const fetchSuggestions = async (searchQuery) => {
    const value = searchQuery.trim();

    if (!value) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [result, song, artist] = await Promise.all([
        getSearchData(value),
        getSongbyQuery(value, 5),
        getArtistbyQuery(value, 5),
      ]);

      const allSuggestions = [];

      /* ================= SONGS ================= */

      if (Array.isArray(song?.data?.results)) {
        allSuggestions.push(
          ...song.data.results.map((item) => ({
            type: "Song",
            name: safeDecode(item.name),
            id: item.id,
            duration: item.duration || 0,
            artist: item.artists || item.artist || "",
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

      /* ================= ALBUMS ================= */

      if (Array.isArray(result?.data?.albums?.results)) {
        allSuggestions.push(
          ...result.data.albums.results.map((item) => ({
            type: "Album",
            name: safeDecode(item.title || item.name),
            id: item.id,
            artist: item.artist || item.artists || "",
            image: getImage(item.image),
          }))
        );
      }

      /* ================= PLAYLISTS ================= */

      if (
        Array.isArray(result?.data?.playlists?.results)
      ) {
        allSuggestions.push(
          ...result.data.playlists.results.map((item) => ({
            type: "Playlist",
            name: safeDecode(item.title || item.name),
            id: item.id,
            image: getImage(item.image),
          }))
        );
      }

      /* ================= ARTISTS ================= */

      if (Array.isArray(artist?.data?.results)) {
        allSuggestions.push(
          ...artist.data.results.map((item) => ({
            type: "Artist",
            name: safeDecode(item.name),
            id: item.id,
            image: getImage(item.image),
          }))
        );
      }

      /* ================= REMOVE DUPLICATES ================= */

      const uniqueSuggestions = Array.from(
        new Map(
          allSuggestions.map((item) => [
            `${item.type}-${item.id}`,
            item,
          ])
        ).values()
      );

      setSuggestions(uniqueSuggestions);
    } catch (error) {
      console.error(
        "Error fetching suggestions:",
        error
      );

      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     DEBOUNCE
  ====================================================== */

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuggestions(query);
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
     SEARCH INPUT
  ====================================================== */

  const handleSearchInputChange = (event) => {
    setQuery(event.target.value);
  };

  /* =====================================================
     SEARCH SUBMIT
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
     GET SUGGESTION SONGS
  ====================================================== */

  const getData = async (suggestion) => {
    try {
      const response = await getSuggestionSong(
        suggestion.id
      );

      const suggestedSongs = response?.data || [];

      return [suggestion, ...suggestedSongs];
    } catch (error) {
      console.error(
        "Error fetching suggested songs:",
        error
      );

      return [suggestion];
    }
  };

  /* =====================================================
     SUGGESTION CLICK
  ====================================================== */

  const handleSuggestionClick = async (
    suggestion
  ) => {
    setQuery("");
    setSuggestions([]);

    switch (suggestion.type) {
      case "Song": {
        try {
          const list = await getData(suggestion);

          playMusic(
            suggestion.downloadUrl,
            suggestion.name,
            suggestion.duration,
            suggestion.image,
            suggestion.id,
            suggestion.artist,
            list
          );
        } catch (error) {
          console.error(
            "Error playing song:",
            error
          );
        }

        break;
      }

      case "Album":
        navigate(`/albums/${suggestion.id}`);
        break;

      case "Artist":
        navigate(`/artists/${suggestion.id}`);
        break;

      case "Playlist":
        navigate(`/playlists/${suggestion.id}`);
        break;

      default:
        console.warn(
          "Unknown suggestion type:",
          suggestion.type
        );
    }
  };

  return (
    <nav
      className="
        fixed
        top-0
        left-0
        right-0
        z-[900]
        w-full
        bg-white
        text-black
        shadow-sm
        dark:bg-[#0b0b0d]
        dark:text-white
      "
    >
      <div
        className="
          mx-auto
          w-full
          max-w-[1600px]
          px-2
          sm:px-4
          lg:px-6
        "
      >
        {/* =================================================
            TOP ROW
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

          {/* GREETING - MOBILE */}

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

            <Link
              to="/Spotify"
              className="
                font-semibold
                transition-opacity
                hover:text-[#1DB954]
              "
            >
              Spotify
            </Link>

            <Link
              to="/LiveTV"
              className="
                font-semibold
                transition-opacity
                hover:opacity-60
              "
            >
              Live TV
            </Link>
          </div>

          {/* DESKTOP SEARCH */}

          <div
            className="
              relative
              hidden
              min-w-0
              flex-1
              lg:block
              lg:max-w-[650px]
            "
            ref={searchRef}
          >
            <SearchForm
              query={query}
              onChange={handleSearchInputChange}
              onSubmit={handleSearchSubmit}
            />

            <Suggestions
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
            MOBILE SEARCH
        ================================================== */}

        <div
          className="
            relative
            pb-2
            lg:hidden
          "
          ref={searchRef}
        >
          <SearchForm
            query={query}
            onChange={handleSearchInputChange}
            onSubmit={handleSearchSubmit}
          />

          <Suggestions
            loading={loading}
            suggestions={suggestions}
            onClick={handleSuggestionClick}
          />
        </div>
      </div>
    </nav>
  );
};

/* =====================================================
   SEARCH FORM
====================================================== */

const SearchForm = ({
  query,
  onChange,
  onSubmit,
}) => {
  return (
    <form
      onSubmit={onSubmit}
      className="w-full"
    >
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
          dark:border-white/10
          dark:bg-white/5
        "
      >
        {/* SEARCH ICON */}

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

        {/* INPUT */}

        <input
          type="text"
          name="search"
          id="search"
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
          value={query}
          onChange={onChange}
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
        />

        {/* SEARCH BUTTON */}

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

const Suggestions = ({
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
        top-[calc(100%+6px)]
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
        <div
          className="
            p-5
            text-center
            text-sm
            opacity-60
          "
        >
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
            (suggestion, index) => (
              <button
                key={`${suggestion.type}-${suggestion.id}-${index}`}
                type="button"
                onClick={() =>
                  onClick(suggestion)
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
                      bg-gray-500/20
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
            )
          )}
        </div>
      )}
    </div>
  );
};

export default Navbar;
