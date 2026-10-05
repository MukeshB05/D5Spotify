import {
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { Link } from "react-router-dom";
import { FaSpotify } from "react-icons/fa";

import MusicContext from "../context/MusicContext";
import SongsList from "../components/SongsList";
import Navbar from "../components/Navbar";
import Navigator from "../components/Navigator";

/* ---------------------------------------------
   Helpers
--------------------------------------------- */

const imageUrl = (image) => {
  if (Array.isArray(image)) {
    for (let i = image.length - 1; i >= 0; i -= 1) {
      const item = image[i];

      const url =
        typeof item === "string"
          ? item
          : item?.url ||
            item?.link ||
            item?.src;

      if (url) {
        return url;
      }
    }
  }

  if (
    typeof image === "string" &&
    image.trim()
  ) {
    return image;
  }

  if (
    image &&
    typeof image === "object"
  ) {
    return (
      image.url ||
      image.link ||
      image.src ||
      "/Unknown.png"
    );
  }

  return "/Unknown.png";
};

const artistNames = (artists) => {
  if (Array.isArray(artists?.primary)) {
    return artists.primary
      .map((artist) => artist?.name)
      .filter(Boolean)
      .join(", ");
  }

  if (Array.isArray(artists)) {
    return artists
      .map(
        (artist) =>
          artist?.name || artist
      )
      .filter(Boolean)
      .join(", ");
  }

  if (typeof artists === "string") {
    return artists;
  }

  return "";
};

const readArray = (key) => {
  try {
    const value = JSON.parse(
      localStorage.getItem(key) || "[]"
    );

    return Array.isArray(value)
      ? value
      : [];
  } catch (error) {
    console.error(
      `Failed to read ${key}:`,
      error
    );

    return [];
  }
};

/* ---------------------------------------------
   Favourite Component
--------------------------------------------- */

const Favourite = () => {
  const musicContext =
    useContext(MusicContext) || {};

  const { playMusic } = musicContext;

  const [likedSongs, setLikedSongs] =
    useState([]);

  const [likedAlbums, setLikedAlbums] =
    useState([]);

  const [likedPlaylists, setLikedPlaylists] =
    useState([]);

  /* ---------------------------------------------
     Load favourites
  --------------------------------------------- */

  const loadFavourites = useCallback(() => {
    setLikedSongs(
      readArray("likedSongs")
    );

    setLikedAlbums(
      readArray("likedAlbums")
    );

    setLikedPlaylists(
      readArray("likedPlaylists")
    );
  }, []);

  /* ---------------------------------------------
     Load + listen for favourite updates
  --------------------------------------------- */

  useEffect(() => {
    loadFavourites();

    const update = () => {
      loadFavourites();
    };

    window.addEventListener(
      "storage",
      update
    );

    window.addEventListener(
      "favouritesUpdated",
      update
    );

    return () => {
      window.removeEventListener(
        "storage",
        update
      );

      window.removeEventListener(
        "favouritesUpdated",
        update
      );
    };
  }, [loadFavourites]);

  /* ---------------------------------------------
     Remove favourite
  --------------------------------------------- */

  const removeItem = useCallback(
    (key, id) => {
      if (id == null) {
        return;
      }

      const current = readArray(key);

      const updated = current.filter(
        (item) =>
          String(item?.id) !==
          String(id)
      );

      localStorage.setItem(
        key,
        JSON.stringify(updated)
      );

      loadFavourites();

      window.dispatchEvent(
        new Event("favouritesUpdated")
      );
    },
    [loadFavourites]
  );

  const removeSong = (id) => {
    removeItem("likedSongs", id);
  };

  const removeAlbum = (id) => {
    removeItem("likedAlbums", id);
  };

  const removePlaylist = (id) => {
    removeItem(
      "likedPlaylists",
      id
    );
  };

  /* ---------------------------------------------
     Play favourite song
  --------------------------------------------- */

  const playFavouriteSong =
    useCallback(
      (song) => {
        if (
          !song ||
          typeof playMusic !==
            "function"
        ) {
          return;
        }

        const queue =
          likedSongs.filter(
            (item) => item?.id != null
          );

        playMusic(
          song,
          queue.length > 0
            ? queue
            : undefined
        );
      },
      [likedSongs, playMusic]
    );

  /* ---------------------------------------------
     Total favourites
  --------------------------------------------- */

  const total =
    likedSongs.length +
    likedAlbums.length +
    likedPlaylists.length;

  /* ---------------------------------------------
     Render
  --------------------------------------------- */

  return (
    <>
      <Navbar />

      {/*
        IMPORTANT:
        Navbar is taller on mobile.
        Use responsive top padding so the
        Favourite heading never goes behind
        the Navbar/search bar.
      */}

      <main
        className="
          min-h-screen
          w-full

          pt-[9.5rem]
          sm:pt-[8rem]
          lg:pt-[7rem]

          px-4
          sm:px-6
          lg:px-8

          pb-[7rem]
          sm:pb-[7rem]
          lg:pb-10

          text-gray-900
          dark:text-white

          transition-colors
          duration-200
        "
      >
        <div
          className="
            mx-auto
            w-full
            max-w-7xl
          "
        >
          {/* =========================================
              HEADER
          ========================================= */}

          <header
            className="
              mb-7
              relative
              z-10
            "
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h1
                  className="
                    text-2xl
                    sm:text-3xl
                    font-bold
                    text-gray-900
                    dark:text-white
                  "
                >
                  Favourite
                </h1>

                <p
                  className="
                    mt-1
                    text-sm
                    text-gray-500
                    dark:text-gray-400
                  "
                >
                  Your favourite songs,
                  albums and playlists
                </p>
              </div>

              {total > 0 && (
                <span
                  className="
                    shrink-0
                    rounded-full
                    bg-gray-100
                    dark:bg-gray-800
                    px-3
                    py-1
                    text-xs
                    text-gray-600
                    dark:text-gray-300
                  "
                >
                  {total} item
                  {total === 1
                    ? ""
                    : "s"}
                </span>
              )}
            </div>
          </header>

          {/* =========================================
              EMPTY STATE
          ========================================= */}

          {total === 0 && (
            <div
              className="
                min-h-[55vh]
                flex
                flex-col
                items-center
                justify-center
                text-center
                px-4
                pb-8
              "
            >
              <div
                className="
                  mb-5
                  text-[5rem]
                  leading-none
                  text-gray-400
                  dark:text-gray-500
                "
                aria-hidden="true"
              >
                ♡
              </div>

              <h2
                className="
                  text-xl
                  sm:text-2xl
                  font-semibold
                  text-gray-700
                  dark:text-gray-300
                "
              >
                No Favourite Items
              </h2>

              <p
                className="
                  mt-3
                  max-w-md
                  text-sm
                  sm:text-base
                  text-gray-500
                  dark:text-gray-400
                "
              >
                Import from Spotify or
                like songs, albums and
                playlists.
              </p>
            </div>
          )}

          {/* =========================================
              SONGS
          ========================================= */}

          {likedSongs.length > 0 && (
            <section className="mb-10">
              <div
                className="
                  mb-3
                  flex
                  items-center
                  justify-between
                "
              >
                <h2
                  className="
                    text-xl
                    font-bold
                    text-gray-900
                    dark:text-white
                  "
                >
                  Songs
                </h2>

                <span
                  className="
                    rounded-full
                    bg-gray-100
                    dark:bg-gray-800
                    px-2.5
                    py-1
                    text-xs
                    text-gray-600
                    dark:text-gray-300
                  "
                >
                  {likedSongs.length}
                </span>
              </div>

              <div
                className="
                  w-full
                  overflow-hidden
                  rounded-xl

                  border
                  border-gray-200
                  dark:border-gray-800

                  bg-white
                  dark:bg-gray-950

                  transition-colors
                  duration-200
                "
              >
                {likedSongs.map(
                  (song, index) => (
                    <div
                      key={
                        song?.id ??
                        `song-${index}`
                      }
                      className="
                        relative
                        flex
                        items-center
                        border-b
                        border-gray-200
                        last:border-b-0
                        dark:border-gray-800
                      "
                    >
                      <div
                        className="
                          min-w-0
                          flex-1
                        "
                      >
                        <SongsList
                          {...song}
                          song={song}
                          songs={likedSongs}
                          onPlay={
                            playFavouriteSong
                          }
                        />
                      </div>

                      {/* Spotify Song Link */}
                      {song?.spotifyUrl && (
                        <a
                          href={
                            song.spotifyUrl
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="
                            mr-1
                            flex
                            h-9
                            w-9
                            shrink-0
                            items-center
                            justify-center
                            rounded-full
                            text-[#1DB954]
                            hover:bg-[#1DB954]/10
                            active:bg-[#1DB954]/20
                          "
                          title="Open song in Spotify"
                          aria-label="Open song in Spotify"
                          onClick={(
                            event
                          ) => {
                            event.stopPropagation();
                          }}
                        >
                          <FaSpotify className="text-xl" />
                        </a>
                      )}

                      {/* Remove Song */}
                      <button
                        type="button"
                        onClick={() =>
                          removeSong(
                            song?.id
                          )
                        }
                        className="
                          mr-2
                          flex
                          h-8
                          w-8
                          shrink-0
                          items-center
                          justify-center
                          rounded-full

                          text-red-500

                          hover:bg-red-500/10
                          active:bg-red-500/20
                        "
                        title="Remove from Favourite"
                        aria-label="Remove song from Favourite"
                      >
                        ×
                      </button>
                    </div>
                  )
                )}
              </div>
            </section>
          )}

          {/* =========================================
              ALBUMS
          ========================================= */}

          {likedAlbums.length > 0 && (
            <section className="mb-10">
              <div
                className="
                  mb-4
                  flex
                  items-center
                  justify-between
                "
              >
                <h2
                  className="
                    text-xl
                    font-bold
                    text-gray-900
                    dark:text-white
                  "
                >
                  Albums
                </h2>

                <span
                  className="
                    rounded-full
                    bg-gray-100
                    dark:bg-gray-800
                    px-2.5
                    py-1
                    text-xs
                    text-gray-600
                    dark:text-gray-300
                  "
                >
                  {likedAlbums.length}
                </span>
              </div>

              <div
                className="
                  grid
                  grid-cols-2
                  gap-4
                  sm:grid-cols-3
                  md:grid-cols-4
                  lg:grid-cols-5
                  xl:grid-cols-6
                "
              >
                {likedAlbums.map(
                  (album, index) => {
                    const spotifyUrl =
                      album?.spotifyUrl;

                    const content = (
                      <>
                        <div
                          className="
                            relative
                            aspect-square
                            overflow-hidden
                            rounded-xl

                            bg-gray-100
                            dark:bg-gray-900
                          "
                        >
                          <img
                            src={imageUrl(
                              album?.image
                            )}
                            alt={
                              album?.name ||
                              "Album"
                            }
                            className="
                              h-full
                              w-full
                              object-cover
                              transition
                              duration-300
                              group-hover:scale-105
                            "
                            loading="lazy"
                            onError={(
                              event
                            ) => {
                              event.currentTarget.onerror =
                                null;

                              event.currentTarget.src =
                                "/Unknown.png";
                            }}
                          />

                          {spotifyUrl && (
                            <span
                              className="
                                absolute
                                right-2
                                top-2
                                rounded-full
                                bg-[#1DB954]
                                px-2
                                py-1
                                text-[10px]
                                font-bold
                                text-black
                              "
                            >
                              Spotify
                            </span>
                          )}
                        </div>

                        <div className="px-1 pt-2">
                          <div
                            className="
                              truncate
                              text-sm
                              font-semibold
                              text-gray-900
                              dark:text-white
                            "
                          >
                            {album?.name ||
                              "Unknown Album"}
                          </div>

                          <div
                            className="
                              mt-1
                              truncate
                              text-xs
                              text-gray-500
                              dark:text-gray-400
                            "
                          >
                            {artistNames(
                              album?.artists
                            ) ||
                              "Album"}
                          </div>
                        </div>
                      </>
                    );

                    return (
                      <div
                        key={
                          album?.id ??
                          `album-${index}`
                        }
                        className="group relative"
                      >
                        {spotifyUrl ? (
                          <a
                            href={spotifyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            {content}
                          </a>
                        ) : album?.id ? (
                          <Link
                            to={`/albums/${album.id}`}
                            className="block"
                          >
                            {content}
                          </Link>
                        ) : (
                          <div className="block">
                            {content}
                          </div>
                        )}

                        {/* Remove Album */}
                        <button
                          type="button"
                          onClick={() =>
                            removeAlbum(
                              album?.id
                            )
                          }
                          className="
                            absolute
                            left-2
                            top-2
                            flex
                            h-8
                            w-8
                            items-center
                            justify-center
                            rounded-full
                            bg-black/70
                            text-white

                            opacity-100
                            sm:opacity-0
                            sm:group-hover:opacity-100

                            transition
                          "
                          aria-label="Remove album from Favourite"
                          title="Remove from Favourite"
                        >
                          ×
                        </button>
                      </div>
                    );
                  }
                )}
              </div>
            </section>
          )}

          {/* =========================================
              PLAYLISTS
          ========================================= */}

          {likedPlaylists.length > 0 && (
            <section className="mb-10">
              <div
                className="
                  mb-4
                  flex
                  items-center
                  justify-between
                "
              >
                <h2
                  className="
                    text-xl
                    font-bold
                    text-gray-900
                    dark:text-white
                  "
                >
                  Playlists
                </h2>

                <span
                  className="
                    rounded-full
                    bg-gray-100
                    dark:bg-gray-800
                    px-2.5
                    py-1
                    text-xs
                    text-gray-600
                    dark:text-gray-300
                  "
                >
                  {likedPlaylists.length}
                </span>
              </div>

              <div
                className="
                  grid
                  grid-cols-2
                  gap-4
                  sm:grid-cols-3
                  md:grid-cols-4
                  lg:grid-cols-5
                  xl:grid-cols-6
                "
              >
                {likedPlaylists.map(
                  (playlist, index) => {
                    const spotifyUrl =
                      playlist?.spotifyUrl;

                    const content = (
                      <>
                        <div
                          className="
                            relative
                            aspect-square
                            overflow-hidden
                            rounded-xl

                            bg-gray-100
                            dark:bg-gray-900
                          "
                        >
                          <img
                            src={imageUrl(
                              playlist?.image
                            )}
                            alt={
                              playlist?.name ||
                              "Playlist"
                            }
                            className="
                              h-full
                              w-full
                              object-cover
                              transition
                              duration-300
                              group-hover:scale-105
                            "
                            loading="lazy"
                            onError={(
                              event
                            ) => {
                              event.currentTarget.onerror =
                                null;

                              event.currentTarget.src =
                                "/Unknown.png";
                            }}
                          />

                          {spotifyUrl && (
                            <span
                              className="
                                absolute
                                right-2
                                top-2
                                rounded-full
                                bg-[#1DB954]
                                px-2
                                py-1
                                text-[10px]
                                font-bold
                                text-black
                              "
                            >
                              Spotify
                            </span>
                          )}
                        </div>

                        <div className="px-1 pt-2">
                          <div
                            className="
                              truncate
                              text-sm
                              font-semibold
                              text-gray-900
                              dark:text-white
                            "
                          >
                            {playlist?.name ||
                              "Unknown Playlist"}
                          </div>

                          <div
                            className="
                              mt-1
                              truncate
                              text-xs
                              text-gray-500
                              dark:text-gray-400
                            "
                          >
                            Playlist
                          </div>
                        </div>
                      </>
                    );

                    return (
                      <div
                        key={
                          playlist?.id ??
                          `playlist-${index}`
                        }
                        className="group relative"
                      >
                        {spotifyUrl ? (
                          <a
                            href={spotifyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            {content}
                          </a>
                        ) : playlist?.id ? (
                          <Link
                            to={`/playlists/${playlist.id}`}
                            className="block"
                          >
                            {content}
                          </Link>
                        ) : (
                          <div className="block">
                            {content}
                          </div>
                        )}

                        {/* Remove Playlist */}
                        <button
                          type="button"
                          onClick={() =>
                            removePlaylist(
                              playlist?.id
                            )
                          }
                          className="
                            absolute
                            left-2
                            top-2
                            flex
                            h-8
                            w-8
                            items-center
                            justify-center
                            rounded-full
                            bg-black/70
                            text-white

                            opacity-100
                            sm:opacity-0
                            sm:group-hover:opacity-100

                            transition
                          "
                          aria-label="Remove playlist from Favourite"
                          title="Remove from Favourite"
                        >
                          ×
                        </button>
                      </div>
                    );
                  }
                )}
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
