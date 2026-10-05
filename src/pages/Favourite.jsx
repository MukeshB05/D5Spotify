import { useCallback, useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaSpotify } from "react-icons/fa";
import MusicContext from "../context/MusicContext";
import SongsList from "../components/SongsList";
import Navbar from "../components/Navbar";
import Navigator from "../components/Navigator";

const imageUrl = (image) => {
  if (Array.isArray(image)) {
    for (let i = image.length - 1; i >= 0; i -= 1) {
      const item = image[i];
      const url = typeof item === "string" ? item : item?.url || item?.link || item?.src;
      if (url) return url;
    }
  }

  if (typeof image === "string" && image.trim()) return image;
  if (image && typeof image === "object") return image.url || image.link || image.src || "/Unknown.png";
  return "/Unknown.png";
};

const artistNames = (artists) => {
  if (Array.isArray(artists?.primary)) {
    return artists.primary.map((artist) => artist?.name).filter(Boolean).join(", ");
  }
  if (Array.isArray(artists)) {
    return artists.map((artist) => artist?.name || artist).filter(Boolean).join(", ");
  }
  return typeof artists === "string" ? artists : "";
};

const readArray = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch (error) {
    console.error(`Failed to read ${key}:`, error);
    return [];
  }
};

const Favourite = () => {
  const { playMusic } = useContext(MusicContext) || {};
  const [likedSongs, setLikedSongs] = useState([]);
  const [likedAlbums, setLikedAlbums] = useState([]);
  const [likedPlaylists, setLikedPlaylists] = useState([]);

  const loadFavourites = useCallback(() => {
    setLikedSongs(readArray("likedSongs"));
    setLikedAlbums(readArray("likedAlbums"));
    setLikedPlaylists(readArray("likedPlaylists"));
  }, []);

  useEffect(() => {
    loadFavourites();

    const update = () => loadFavourites();
    window.addEventListener("storage", update);
    window.addEventListener("favouritesUpdated", update);

    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("favouritesUpdated", update);
    };
  }, [loadFavourites]);

  const removeItem = (key, id) => {
    if (id == null) return;

    const current = readArray(key);
    const updated = current.filter((item) => String(item?.id) !== String(id));
    localStorage.setItem(key, JSON.stringify(updated));
    loadFavourites();
    window.dispatchEvent(new Event("favouritesUpdated"));
  };

  const removeSong = (id) => removeItem("likedSongs", id);
  const removeAlbum = (id) => removeItem("likedAlbums", id);
  const removePlaylist = (id) => removeItem("likedPlaylists", id);

  const playFavouriteSong = (song) => {
    if (!song || typeof playMusic !== "function") return;

    const queue = likedSongs.filter((item) => item?.id != null);
    playMusic(song, queue.length ? queue : undefined);
  };

  const total = likedSongs.length + likedAlbums.length + likedPlaylists.length;

  return (
    <>
      <Navbar />
      <div className="flex flex-col mb-[12rem] gap-[2rem] ">
        {/* Header */}
        <div className="lg:ml-[3rem] ml-[2rem] flex items-center gap-5 mt-[9rem] lg:mt-[6rem]">
      <main className="min-h-screen w-full pt-[6rem] px-4 pb-32">
        <div className="mx-auto w-full max-w-7xl">
          <header className="mb-7">
            <h1 className="text-2xl sm:text-3xl font-bold">Favourite</h1>
            <p className="mt-1 text-sm opacity-60">Your favourite songs, albums and playlists</p>
            {total > 0 && <p className="mt-2 text-xs opacity-50">{total} item{total === 1 ? "" : "s"}</p>}
          </header>

          {total === 0 && (
            <div className="min-h-[50vh] flex flex-col items-center justify-center text-center opacity-60">
              <div className="text-6xl mb-4">♡</div>
              <h2 className="text-lg font-semibold">No Favourite Items</h2>
              <p className="mt-2 text-sm">Import from Spotify or like songs, albums and playlists.</p>
            </div>
          )}

          {likedSongs.length > 0 && (
            <section className="mb-10">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xl font-bold">Songs</h2>
                <span className="text-xs opacity-60">{likedSongs.length}</span>
              </div>

              <div className="w-full overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
                {likedSongs.map((song, index) => (
                  <div key={song?.id ?? `song-${index}`} className="relative flex items-center">
                    <div className="min-w-0 flex-1">
                      <SongsList
                        {...song}
                        song={song}
                        songs={likedSongs}
                        onPlay={playFavouriteSong}
                      />
                    </div>

                    {song?.spotifyUrl && (
                      <a
                        href={song.spotifyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#1DB954] hover:bg-[#1DB954]/10"
                        title="Open song in Spotify"
                        aria-label="Open song in Spotify"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <FaSpotify className="text-xl" />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => removeSong(song?.id)}
                      className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-red-500 hover:bg-red-500/10"
                      title="Remove from Favourite"
                      aria-label="Remove song from Favourite"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {likedAlbums.length > 0 && (
            <section className="mb-10">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Albums</h2>
                <span className="text-xs opacity-60">{likedAlbums.length}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {likedAlbums.map((album, index) => {
                  const spotify = album?.source === "spotify" && album?.spotifyUrl;
                  const content = (
                    <>
                      <div className="relative aspect-square overflow-hidden rounded-xl">
                        <img
                          src={imageUrl(album?.image)}
                          alt={album?.name || "Album"}
                          className="h-full w-full object-cover transition duration-300 hover:scale-105"
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = "/Unknown.png";
                          }}
                        />
                        {spotify && (
                          <span className="absolute right-2 top-2 rounded-full bg-[#1DB954] px-2 py-1 text-[10px] font-bold text-black">
                            Spotify
                          </span>
                        )}
                      </div>
                      <div className="pt-2 px-1">
                        <div className="truncate text-sm font-semibold">{album?.name || "Unknown Album"}</div>
                        <div className="mt-1 truncate text-xs opacity-60">{artistNames(album?.artists) || "Album"}</div>
                      </div>
                    </>
                  );

                  return (
                    <div key={album?.id ?? `album-${index}`} className="group relative">
                      {spotify ? (
                        <a href={album.spotifyUrl} target="_blank" rel="noreferrer" className="block">
                          {content}
                        </a>
                      ) : (
                        <Link to={`/albums/${album?.id}`} className="block">
                          {content}
                        </Link>
                      )}

                      <button
                        type="button"
                        onClick={() => removeAlbum(album?.id)}
                        className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition group-hover:opacity-100"
                        aria-label="Remove album from Favourite"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {likedPlaylists.length > 0 && (
            <section className="mb-10">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Playlists</h2>
                <span className="text-xs opacity-60">{likedPlaylists.length}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {likedPlaylists.map((playlist, index) => {
                  const spotify = playlist?.source === "spotify" && playlist?.spotifyUrl;
                  const content = (
                    <>
                      <div className="relative aspect-square overflow-hidden rounded-xl">
                        <img
                          src={imageUrl(playlist?.image)}
                          alt={playlist?.name || "Playlist"}
                          className="h-full w-full object-cover transition duration-300 hover:scale-105"
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = "/Unknown.png";
                          }}
                        />
                        {spotify && (
                          <span className="absolute right-2 top-2 rounded-full bg-[#1DB954] px-2 py-1 text-[10px] font-bold text-black">
                            Spotify
                          </span>
                        )}
                      </div>
                      <div className="pt-2 px-1">
                        <div className="truncate text-sm font-semibold">{playlist?.name || "Unknown Playlist"}</div>
                        <div className="mt-1 text-xs opacity-60">Playlist</div>
                      </div>
                    </>
                  );

                  return (
                    <div key={playlist?.id ?? `playlist-${index}`} className="group relative">
                      {spotify ? (
                        <a href={playlist.spotifyUrl} target="_blank" rel="noreferrer" className="block">
                          {content}
                        </a>
                      ) : (
                        <Link to={`/playlists/${playlist?.id}`} className="block">
                          {content}
                        </Link>
                      )}

                      <button
                        type="button"
                        onClick={() => removePlaylist(playlist?.id)}
                        className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition group-hover:opacity-100"
                        aria-label="Remove playlist from Favourite"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </main>

      <Navigator />
    </>
  );
};

export default Favourite;
