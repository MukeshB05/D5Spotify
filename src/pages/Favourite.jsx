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
   SAFE STRING
========================================================= */

const safeString = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
};

/* =========================================================
   IMAGE URL
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

      if (safeString(url)) {
        return safeString(url);
      }
    }
  }

  if (typeof image === "string") {
    const value = image.trim();

    if (value) {
      return value;
    }
  }

  if (image && typeof image === "object") {
    const url =
      image.url ||
      image.link ||
      image.src;

    if (safeString(url)) {
      return safeString(url);
    }
  }

  return "/Unknown.png";
};

/* =========================================================
   ARTIST NAMES
========================================================= */

const artistNames = (artists) => {
  if (Array.isArray(artists?.primary)) {
    return artists.primary
      .map((artist) =>
        typeof artist === "string"
          ? artist
          : artist?.name
      )
      .filter(Boolean)
      .join(", ");
  }

  if (Array.isArray(artists)) {
    return artists
      .map((artist) =>
        typeof artist === "string"
          ? artist
          : artist?.name
      )
      .filter(Boolean)
      .join(", ");
  }

  if (typeof artists === "string") {
    return artists;
  }

  if (artists?.name) {
    return artists.name;
  }

  return "";
};

/* =========================================================
   LOCAL STORAGE
========================================================= */

const readArray = (key) => {
  try {
    const raw = localStorage.getItem(key);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
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
   SPOTIFY URL NORMALIZER

   Supports:

   https://open.spotify.com/playlist/...
   http://open.spotify.com/playlist/...
   spotify:playlist:ID
   spotify://playlist/ID
========================================================= */

const normalizeSpotifyUrl = (value) => {
  const cleanValue = safeString(value);

  if (!cleanValue) {
    return "";
  }

  /* Already Spotify web URL */
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

  /* spotify:playlist:ID */
  if (cleanValue.startsWith("spotify:")) {
    const parts = cleanValue.split(":");

    if (
      parts.length >= 3 &&
      parts[1] &&
      parts[2]
    ) {
      const type = parts[1].trim();
      const id = parts[2].trim();

      if (type && id) {
        return `https://open.spotify.com/${type}/${id}`;
      }
    }
  }

  /* spotify://playlist/ID */
  if (cleanValue.startsWith("spotify://")) {
    const valueWithoutScheme =
      cleanValue.replace(
        "spotify://",
        ""
      );

    const parts =
      valueWithoutScheme.split("/");

    if (
      parts.length >= 2 &&
      parts[0] &&
      parts[1]
    ) {
      return `https://open.spotify.com/${parts[0]}/${parts[1]}`;
    }
  }

  return "";
};

/* =========================================================
   SPOTIFY URL

   Checks many possible API/import formats.
========================================================= */

const getSpotifyUrl = (item) => {
  if (!item || typeof item !== "object") {
    return "";
  }

  const possibleUrls = [
    /* Direct */
    item.spotifyUrl,
    item.spotify_url,
    item.spotifyLink,
    item.spotify_link,

    /* Standard Spotify */
    item.uri,

    /* Spotify external URLs */
    item.external_urls?.spotify,
    item.externalUrls?.spotify,

    /* Nested spotify object */
    item.spotify?.url,
    item.spotify?.uri,
    item.spotify?.spotifyUrl,
    item.spotify?.spotify_url,
    item.spotify?.external_urls?.spotify,
    item.spotify?.externalUrls?.spotify,

    /* Nested links */
    item.links?.spotify,
    item.urls?.spotify,
  ];

  for (const value of possibleUrls) {
    const normalized =
      normalizeSpotifyUrl(value);

    if (normalized) {
      return normalized;
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

  const typeValues = [
    item.type,
    item.spotifyType,
    item.spotify_type,
    item.spotify?.type,
  ];

  for (const value of typeValues) {
    const type = safeString(value).toLowerCase();

    if (type) {
      return type;
    }
  }

  /* Detect from Spotify URL */
  const spotifyUrl =
    getSpotifyUrl(item);

  if (spotifyUrl) {
    const match =
      spotifyUrl.match(
        /open\.spotify\.com\/([^/?#]+)\/([^/?#]+)/i
      );

    if (match?.[1]) {
      return match[1].toLowerCase();
    }
  }

  return "";
};

/* =========================================================
   ITEM UNIQUE KEY

   Used for React keys and removing imported items.
========================================================= */

const getItemKey = (item, fallback = "") => {
  if (!item || typeof item !== "object") {
    return fallback;
  }

  if (
    item.id !== undefined &&
    item.id !== null &&
    safeString(item.id)
  ) {
    return String(item.id);
  }

  const spotifyUrl =
    getSpotifyUrl(item);

  if (spotifyUrl) {
    return spotifyUrl;
  }

  return fallback;
};

/* =========================================================
   FAVOURITE COMPONENT
========================================================= */

const Favourite = () => {
  const musicContext =
    useContext(MusicContext) || {};

  const {
    playMusic,
  } = musicContext;

  const [
    likedSongs,
    setLikedSongs,
  ] = useState([]);

  const [
    likedAlbums,
    setLikedAlbums,
  ] = useState([]);

  const [
    likedPlaylists,
    setLikedPlaylists,
  ] = useState([]);

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
     INITIAL LOAD + EVENTS
  ======================================================= */

  useEffect(() => {
    loadFavourites();

    const updateFavourites = () => {
      loadFavourites();
    };

    window.addEventListener(
      "storage",
      updateFavourites
    );

    window.addEventListener(
      "favouritesUpdated",
      updateFavourites
    );

    return () => {
      window.removeEventListener(
        "storage",
        updateFavourites
      );

      window.removeEventListener(
        "favouritesUpdated",
        updateFavourites
      );
    };
  }, [loadFavourites]);

  /* =======================================================
     REMOVE FAVOURITE

     Supports normal IDs and Spotify URLs.
  ======================================================= */

  const removeItem = useCallback(
    (key, item) => {
      if (!item) {
        return;
      }

      const current =
        readArray(key);

      const itemId =
        safeString(item?.id);

      const itemSpotifyUrl =
        getSpotifyUrl(item);

      const updated =
        current.filter(
          (storedItem) => {
            const storedId =
              safeString(
                storedItem?.id
              );

            const storedSpotifyUrl =
              getSpotifyUrl(
                storedItem
              );

            /* Match ID */
            if (
              itemId &&
              storedId
            ) {
              return (
                storedId !==
                itemId
              );
            }

            /* Match Spotify URL */
            if (
              itemSpotifyUrl &&
              storedSpotifyUrl
            ) {
              return (
                storedSpotifyUrl !==
                itemSpotifyUrl
              );
            }

            return true;
          }
        );

      localStorage.setItem(
        key,
        JSON.stringify(updated)
      );

      loadFavourites();

      window.dispatchEvent(
        new Event(
          "favouritesUpdated"
        )
      );
    },
    [loadFavourites]
  );

  /* =======================================================
     REMOVE SONG
  ======================================================= */

  const removeSong = useCallback(
    (song) => {
      removeItem(
        "likedSongs",
        song
      );
    },
    [removeItem]
  );

  /* =======================================================
     REMOVE ALBUM
  ======================================================= */

  const removeAlbum = useCallback(
    (album) => {
      removeItem(
        "likedAlbums",
        album
      );
    },
    [removeItem]
  );

  /* =======================================================
     REMOVE PLAYLIST
  ======================================================= */

  const removePlaylist =
    useCallback(
      (playlist) => {
        removeItem(
          "likedPlaylists",
          playlist
        );
      },
      [removeItem]
    );

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
              item &&
              item.id !==
                undefined &&
              item.id !== null
          );

        playMusic(
          song,
          queue.length > 0
            ? queue
            : undefined
        );
      },
      [
        likedSongs,
        playMusic,
      ]
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
                  (song, index) => {
                    const spotifyUrl =
                      getSpotifyUrl(song);

                    return (
                      <div
                        key={getItemKey(
                          song,
                          `song-${index}`
                        )}
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

                        {/* SPOTIFY SONG */}

                        {spotifyUrl && (
                          <a
                            href={spotifyUrl}
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
                            removeSong(song)
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
                    );
                  }
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
                      getSpotifyUrl(
                        album
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
                        key={getItemKey(
                          album,
                          `album-${index}`
                        )}
                        className="
                          group
                          relative
                        "
                      >
                        {/* SPOTIFY ALBUM */}

                        {spotifyUrl ? (
                          <a
                            href={spotifyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="
                              block
                              cursor-pointer
                            "
                            title="Open album in Spotify"
                            aria-label="Open album in Spotify"
                          >
                            {content}
                          </a>
                        ) : album?.id ? (
                          <Link
                            to={`/albums/${album.id}`}
                            className="block"
                            title="Open album"
                          >
                            {content}
                          </Link>
                        ) : (
                          <div className="block">
                            {content}
                          </div>
                        )}

                        {/* REMOVE ALBUM */}

                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();

                            removeAlbum(
                              album
                            );
                          }}
                          className="
                            absolute
                            left-2
                            top-2
                            z-20
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
                        key={getItemKey(
                          playlist,
                          `playlist-${index}`
                        )}
                        className="
                          group
                          relative
                        "
                      >
                        {/* =================================================
                            SPOTIFY PLAYLIST REDIRECT
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
                              playlist
                            );
                          }}
                          className="
                            absolute
                            left-2
                            top-2
                            z-20
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
