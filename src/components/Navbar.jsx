import { Link, useNavigate } from "react-router-dom";
import { useState, useContext, useEffect } from "react";
import { getArtistbyQuery, getSearchData, getSongbyQuery, getSuggestionSong } from "../../fetch";
import MusicContext from "../context/MusicContext";
import he from "he";
import Theme from "../../theme";
import { IoSearchOutline } from "react-icons/io5";

const Navbar = () => {
  const { playMusic } = useContext(MusicContext) || {};
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  const fetchSuggestions = async (searchQuery) => {
    const value = String(searchQuery || "").trim();
    if (!value) {
      setSuggestions([]);
      return;
    }

    try {
      const [result, song, artist] = await Promise.all([
        getSearchData(value),
        getSongbyQuery(value, 5),
        getArtistbyQuery(value, 5),
      ]);

      const all = [];

      if (Array.isArray(song?.data?.results)) {
        all.push(...song.data.results.map((item) => ({
          type: "Song",
          name: item?.name || "",
          id: item?.id,
          duration: item?.duration,
          artist: item?.artists,
          image: item?.image?.[2]?.url || item?.image?.[0]?.url || "",
          downloadUrl: item?.downloadUrl?.[4]?.url || item?.downloadUrl?.[0]?.url || "",
        })));
      }

      if (Array.isArray(result?.data?.albums?.results)) {
        all.push(...result.data.albums.results.map((item) => ({
          type: "Album",
          name: item?.title || "",
          id: item?.id,
          artist: item?.artist,
          image: item?.image?.[2]?.url || item?.image?.[0]?.url || "",
        })));
      }

      if (Array.isArray(result?.data?.playlists?.results)) {
        all.push(...result.data.playlists.results.map((item) => ({
          type: "Playlist",
          name: item?.title || "",
          id: item?.id,
          image: item?.image?.[2]?.url || item?.image?.[0]?.url || "",
        })));
      }

      if (Array.isArray(artist?.data?.results)) {
        all.push(...artist.data.results.map((item) => ({
          type: "Artist",
          name: item?.name || "",
          id: item?.id,
          image: item?.image?.[2]?.url || item?.image?.[0]?.url || "",
        })));
      }

      setSuggestions(all);
    } catch (error) {
      console.error("Error fetching search suggestions:", error);
      setSuggestions([]);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchSuggestions(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const value = String(query || "").trim();
    if (!value) return;
    navigate(`/search/${encodeURIComponent(value)}`);
    setSuggestions([]);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    if (hour < 21) return "Good Evening";
    return "Good Night";
  };

  const getSuggestionSongs = async (suggestion) => {
    try {
      const response = await getSuggestionSong(suggestion?.id);
      const songs = Array.isArray(response?.data) ? response.data : [];
      return [suggestion, ...songs];
    } catch (error) {
      console.error("Error fetching suggested songs:", error);
      return [suggestion];
    }
  };

  const handleSuggestionClick = async (suggestion) => {
    setQuery("");
    setSuggestions([]);

    switch (suggestion?.type) {
      case "Song": {
        if (typeof playMusic !== "function") return;
        const list = await getSuggestionSongs(suggestion);
        await playMusic(
          suggestion?.downloadUrl || "",
          suggestion?.name || "",
          suggestion?.duration || 0,
          suggestion?.image || "",
          suggestion?.id,
          suggestion?.artist,
          list
        );
        break;
      }
      case "Album":
        if (suggestion?.id) navigate(`/albums/${suggestion.id}`);
        break;
      case "Artist":
        if (suggestion?.id) navigate(`/artists/${suggestion.id}`);
        break;
      case "Playlist":
        if (suggestion?.id) navigate(`/playlists/${suggestion.id}`);
        break;
      default:
        break;
    }
  };

  return (
    <nav className="navbar fixed left-0 right-0 top-0 z-[70] w-full border-b border-[var(--nav-border)] bg-[var(--navbar-bg)] text-[var(--text-color)] shadow-[0_1px_10px_var(--nav-shadow)]">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-2 px-2 py-2 lg:h-[4.6rem] lg:flex-row lg:items-center lg:gap-5 lg:px-4 lg:py-0">
        <div className="flex w-full items-center gap-3 lg:w-auto lg:min-w-[34rem]">
          <Link to="/" className="flex shrink-0 items-center" aria-label="Home">
            <span className="bg" />
          </Link>

          <div className="flex min-w-0 flex-1 items-center justify-between gap-3 lg:justify-start">
            <span className="truncate text-base font-semibold lg:hidden">{getGreeting()}</span>
            <Theme />
          </div>

          <div className="hidden shrink-0 items-center gap-6 lg:flex">
            <Link to="/Playlist" className="nav-link font-semibold" aria-label="Playlist">Playlist</Link>
            <Link to="/Favourite" className="nav-link font-semibold" aria-label="Favourite">Favourite</Link>
          </div>
        </div>

        <div className="w-full flex-1 lg:max-w-3xl">
          <form onSubmit={handleSearchSubmit} className="relative flex w-full">
            <input
              type="text"
              name="search"
              id="search"
              placeholder="Search for Songs, Artists, and Playlists"
              className="search-input h-10 min-w-0 flex-1 rounded-l-xl px-4 outline-none"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />

            <button type="submit" className="search-btn h-10 w-11 shrink-0 rounded-r-xl" aria-label="Search">
              <IoSearchOutline className="mx-auto text-xl" />
            </button>

            <div className={`suggestionSection absolute left-0 right-0 top-12 z-[90] max-h-[20rem] overflow-auto rounded-xl p-3 shadow-xl transition ${suggestions.length ? "visible opacity-100" : "invisible opacity-0"}`}>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {suggestions.map((suggestion, index) => (
                  <button
                    type="button"
                    key={`${suggestion?.type}-${suggestion?.id}-${index}`}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="flex min-w-0 items-center gap-3 rounded-lg p-2 text-left transition hover:bg-[var(--hover-bg)]"
                  >
                    <img
                      src={suggestion?.image || "/Unknown.png"}
                      alt={suggestion?.name || ""}
                      className="h-11 w-11 shrink-0 rounded object-cover"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = "/Unknown.png";
                      }}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{he.decode(String(suggestion?.name || "Unknown"))}</span>
                      <span className="block text-xs opacity-60">{suggestion?.type}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </form>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
