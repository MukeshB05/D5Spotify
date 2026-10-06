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

/* =========================================================
   HELPERS
========================================================= */

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

/* =========================================================
   ARTIST NAMES
========================================================= */

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

/* =========================================================
   LOCAL STORAGE
========================================================= */

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

/* =========================================================
   SPOTIFY URL HELPER

   Supports:

   spotifyUrl
   spotify_url
   spotifyLink
   spotify_link
   external_urls.spotify
   externalUrls.spotify
   spotifyUri
   spotify_uri
   spotify://playlist/ID
   spotify:playlist:ID
========================================================= */

const getSpotifyUrl = (item) => {
  if (!item || typeof item !== "object") {
    return "";
  }

  const possibleUrls = [
    item.spotifyUrl,
    item.spotify_url,
    item.spotifyLink,
    item.spotify_link,
    item.external_urls?.spotify,
    item.externalUrls?.spotify,
    item.spotify?.external_urls?.spotify,
    item.spotify?.url,
  ];

  for (const value of possibleUrls) {
    if (
      typeof value === "string" &&
      value.trim()
    ) {
      const cleanValue = value.trim();

      if (
        cleanValue.startsWith(
          "https://open.spotify.com/"
        ) ||
        cleanValue.startsWith(
          "http://open.spotify.com/"
        )
      ) {
        return cleanValue;
      }

      /* Spotify URI */
      if (
        cleanValue.startsWith(
          "spotify:"
        )
      ) {
        const parts =
          cleanValue.split(":");

        if (
          parts.length >= 3 &&
          parts[1] &&
          parts[2]
        ) {
          return `https://open.spotify.com/${parts[1]}/${parts[2]}`;
        }
      }
    }
  }

  /* Some APIs store spotify URI separately */
  const spotifyUri =
    item.spotifyUri ||
    item.spotify_uri;

  if (
    typeof spotifyUri === "string" &&
    spotifyUri.startsWith("spotify:")
  ) {
    const parts =
      spotifyUri.split(":");

    if (
      parts.length >= 3 &&
      parts[1] &&
      parts[2]
    ) {
      return `https://open.spotify.com/${parts[1]}/${parts[2]}`;
    }
  }

  return "";
};

/* =========================================================
   SPOTIFY TYPE
========================================================= */

const getSpotifyType = (item) => {
  if (!item || typeof item !== "object") {
    return "";
  }

  if (
    typeof item.type === "string"
  ) {
    return item.type.toLowerCase();
  }

  if (
    typeof item.spotifyType === "string"
  ) {
    return item.spotifyType.toLowerCase();
  }

  return "";
};

/* =========================================================
   FAVOURITE COMPONENT
========================================================= */

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

  /* =======================================================
     LOAD FAVOURITES
  ======================================================= */

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

  /* =======================================================
     LISTEN FOR FAVOURITE UPDATES
  ======================================================= */

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

  /* =======================================================
     REMOVE FAVOURITE
  ======================================================= */

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
    removeItem(
      "likedSongs",
      id
    );
  };

  const removeAlbum = (id) => {
    removeItem(
      "likedAlbums",
      id
    );
  };

  const removePlaylist = (id) => {
    removeItem(
      "likedPlaylists",
      id
    );
  };

  /* =======================================================
     PLAY FAVOURITE SONG
  ======================================================= */

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
            (item) =>
              item?.id != null
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

  /* =======================================================
     TOTAL
  ======================================================= */

  const total =
    likedSongs.length +
    likedAlbums.length +
    likedPlaylists.length;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <Navbar />

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
          lg:pb-10

          bg-[var(--background,#ffffff)]
          text-[var(--text-primary,#111111)]

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
          {/* =================================================
              HEADER
          ================================================= */}

          <header
            className="
              relative
              z-10
              mb-7
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
                gap-3
              "
            >
              <div className="min-w-0">
                <h1
                  className="
                    text-2xl
                    sm:text-3xl
                    font-bold

                    text-[var(--text-primary,#111111)]
                  "
                >
                  Favourite
                </h1>

                <p
                  className="
                    mt-1
                    text-sm

                    text-[var(--text-secondary,#777777)]
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

                    bg-[var(--secondary-bg,#f3f3f3)]

                    px-3
                    py-1

                    text-xs

                    text-[var(--text-secondary,#666666)]
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

          {/* =================================================
              EMPTY STATE
          ================================================= */}

          {total === 0 && (
            <div
              className="
                min-h-[55vh]

                flex
                flex-col
                items-center
                justify-center

                px-4
                pb-8

                text-center
              "
            >
              <div
                className="
                  mb-5
                  text-[5rem]
                  leading-none

                  text-[var(--text-secondary,#777777)]
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

                  text-[var(--text-primary,#111111)]
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

                  text-[var(--text-secondary,#777777)]
                "
              >
                Import from Spotify or
                like songs, albums and
                playlists.
              </p>
            </div>
          )}

          {/* =================================================
              SONGS
          ================================================= */}

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

                    text-[var(--text-primary,#111111)]
                  "
                >
                  Songs
                </h2>

                <span
                  className="
                    rounded-full

                    bg-[var(--secondary-bg,#f3f3f3)]

                    px-2.5
                    py-1

                    text-xs

                    text-[var(--text-secondary,#666666)]
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
                  border-[var(--card-border,#e5e5e5)]

                  bg-[var(--card-bg,#ffffff)]

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
                        border-[var(--card-border,#e5e5e5)]

                        last:border-b-0
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

                      {/* Spotify SONG */}
                      {getSpotifyUrl(song) && (
                        <a
                          href={getSpotifyUrl(
                            song
                          )}
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
                          title="Open in Spotify"
                          aria-label="Open song in Spotify"
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                        >
                          <FaSpotify className="text-xl" />
                        </a>
                      )}

                      {/* REMOVE SONG */}
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

          {/* =================================================
              ALBUMS
          ================================================= */}

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

                    text-[var(--text-primary,#111111)]
                  "
                >
                  Albums
                </h2>

                <span
                  className="
                    rounded-full

                    bg-[var(--secondary-bg,#f3f3f3)]

                    px-2.5
                    py-1

                    text-xs

                    text-[var(--text-secondary,#666666)]
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
                      getSpotifyUrl(album);

                    const content = (
                      <>
                        <div
                          className="
                            relative
                            aspect-square
                            overflow-hidden
                            rounded-xl

                            bg-[var(--secondary-bg,#f3f3f3)]
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

                              text-[var(--text-primary,#111111)]
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

                              text-[var(--text-secondary,#777777)]
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
                        {/* ALWAYS REDIRECT TO SPOTIFY
                            WHEN SPOTIFY URL EXISTS */}

                        {spotifyUrl ? (
                          <a
                            href={spotifyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                            title="Open album in Spotify"
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

          {/* =================================================
              PLAYLISTS
          ================================================= */}

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

                    text-[var(--text-primary,#111111)]
                  "
                >
                  Playlists
                </h2>

                <span
                  className="
                    rounded-full

                    bg-[var(--secondary-bg,#f3f3f3)]

                    px-2.5
                    py-1

                    text-xs

                    text-[var(--text-secondary,#666666)]
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
                      getSpotifyUrl(
                        playlist
                      );

                    const spotifyType =
                      getSpotifyType(
                        playlist
                      );

                    const content = (
                      <>
                        <div
                          className="
                            relative
                            aspect-square
                            overflow-hidden
                            rounded-xl

                            bg-[var(--secondary-bg,#f3f3f3)]
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

                                flex
                                items-center
                                gap-1

                                rounded-full

                                bg-[#1DB954]

                                px-2
                                py-1

                                text-[10px]
                                font-bold
                                text-black
                              "
                            >
                              <FaSpotify />
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

                              text-[var(--text-primary,#111111)]
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

                              text-[var(--text-secondary,#777777)]
                            "
                          >
                            {spotifyUrl ||
                            spotifyType ===
                              "playlist"
                              ? "Spotify Playlist"
                              : "Playlist"}
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
                        {/* =================================================
                            SPOTIFY PLAYLIST REDIRECT

                            If Spotify URL exists:
                            -> open Spotify

                            Otherwise:
                            -> open local playlist
                        ================================================= */}

                        {spotifyUrl ? (
                          <a
                            href={spotifyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="
                              block
                              cursor-pointer
                            "
                            title="Open playlist in Spotify"
                            aria-label="Open playlist in Spotify"
                          >
                            {content}
                          </a>
                        ) : playlist?.id ? (
                          <Link
                            to={`/playlists/${playlist.id}`}
                            className="
                              block
                              cursor-pointer
                            "
                            title="Open playlist"
                          >
                            {content}
                          </Link>
                        ) : (
                          <div className="block">
                            {content}
                          </div>
                        )}

                        {/* REMOVE PLAYLIST */}

                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();

                            removePlaylist(
                              playlist?.id
                            );
                          }}
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
