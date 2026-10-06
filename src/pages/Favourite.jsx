import { useEffect, useRef, useState } from "react";

import Navbar from "../components/Navbar";
import Navigator from "../components/Navigator";
import SongsList from "../components/SongsList";

import PlaylistItems from "../components/Items/PlaylistItems";
import AlbumItems from "../components/Items/AlbumItems";

import { FaHeart, FaSpotify } from "react-icons/fa6";

import {
  MdOutlineKeyboardArrowLeft,
  MdOutlineKeyboardArrowRight,
} from "react-icons/md";


// ======================================================
// Helpers
// ======================================================

const safeString = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};


// ------------------------------------------------------
// Get Spotify URL
// ------------------------------------------------------

const getSpotifyUrl = (item) => {
  if (!item || typeof item !== "object") return "";

  let url =
    item.spotifyUrl ||
    item.spotify_url ||
    item.spotifyLink ||
    item.spotify_link ||
    item.external_urls?.spotify ||
    item.externalUrls?.spotify ||
    item.spotify?.external_urls?.spotify ||
    item.spotify?.externalUrls?.spotify ||
    item.spotify?.url ||
    item.spotify?.uri ||
    item.links?.spotify ||
    item.urls?.spotify ||
    item.spotifyUri ||
    item.spotify_uri ||
    item.uri ||
    "";

  url = safeString(url);

  if (!url) return "";

  // spotify:track:ID
  if (url.startsWith("spotify:")) {
    const parts = url.split(":");

    if (parts.length >= 3) {
      const type = parts[1];
      const id = parts[2];

      if (type && id) {
        return `https://open.spotify.com/${type}/${id}`;
      }
    }
  }

  // spotify://track/ID
  if (url.startsWith("spotify://")) {
    const cleanUrl = url.replace("spotify://", "");
    const parts = cleanUrl.split("/");

    if (parts.length >= 2) {
      return `https://open.spotify.com/${parts[0]}/${parts[1]}`;
    }
  }

  return url;
};


// ------------------------------------------------------
// Detect Spotify type
// ------------------------------------------------------

const getSpotifyType = (item) => {
  if (!item) return "";

  const spotifyUrl = getSpotifyUrl(item);

  if (spotifyUrl) {
    const match = spotifyUrl.match(
      /open\.spotify\.com\/(track|album|playlist)(?:\/|$)/i
    );

    if (match) {
      return match[1].toLowerCase();
    }
  }

  const type = safeString(
    item.spotifyType ||
      item.spotify_type ||
      item.type
  ).toLowerCase();

  if (type === "song") return "track";
  if (type === "track") return "track";
  if (type === "album") return "album";
  if (type === "playlist") return "playlist";

  return "";
};


// ------------------------------------------------------
// Get image
// ------------------------------------------------------

const getImage = (item) => {
  if (!item) return "/Unknown.png";

  const image =
    item.image ||
    item.images?.[0]?.url ||
    item.images?.[0] ||
    item.album?.image ||
    item.album?.images?.[0]?.url ||
    item.album?.images?.[0] ||
    "/Unknown.png";

  if (Array.isArray(image)) {
    return image[0] || "/Unknown.png";
  }

  return safeString(image) || "/Unknown.png";
};


// ------------------------------------------------------
// Get artist name
// ------------------------------------------------------

const getArtists = (artists) => {
  if (!artists) return "Unknown Artist";

  if (typeof artists === "string") {
    return artists;
  }

  if (Array.isArray(artists)) {
    return artists
      .map((artist) => {
        if (typeof artist === "string") {
          return artist;
        }

        return (
          artist?.name ||
          artist?.title ||
          ""
        );
      })
      .filter(Boolean)
      .join(", ");
  }

  if (artists?.primary) {
    return getArtists(artists.primary);
  }

  if (artists?.name) {
    return artists.name;
  }

  return "Unknown Artist";
};


// ------------------------------------------------------
// Unique item key
// ------------------------------------------------------

const getItemKey = (item, index) => {
  return (
    item?.id ||
    item?.spotifyId ||
    item?.spotify_id ||
    getSpotifyUrl(item) ||
    `favourite-${index}`
  );
};


// ======================================================
// Favourite
// ======================================================

const Favourite = () => {
  const [likedSongs, setLikedSongs] = useState([]);
  const [likedAlbums, setLikedAlbums] = useState([]);
  const [likedPlaylists, setLikedPlaylists] = useState([]);

  const [spotifyTracks, setSpotifyTracks] = useState([]);
  const [spotifyAlbums, setSpotifyAlbums] = useState([]);
  const [spotifyPlaylists, setSpotifyPlaylists] = useState([]);

  const [list, setList] = useState([]);

  // --------------------------------------------------
  // Refs
  // --------------------------------------------------

  const albumsScrollRef = useRef(null);
  const playlistsScrollRef = useRef(null);

  const spotifyAlbumsScrollRef = useRef(null);
  const spotifyPlaylistsScrollRef = useRef(null);


  // ==================================================
  // Load favourites
  // ==================================================

  const loadFavourites = () => {
    try {
      const songs = JSON.parse(
        localStorage.getItem("likedSongs") || "[]"
      );

      const albums = JSON.parse(
        localStorage.getItem("likedAlbums") || "[]"
      );

      const playlists = JSON.parse(
        localStorage.getItem("likedPlaylists") || "[]"
      );

      const safeSongs = Array.isArray(songs)
        ? songs
        : [];

      const safeAlbums = Array.isArray(albums)
        ? albums
        : [];

      const safePlaylists = Array.isArray(playlists)
        ? playlists
        : [];

      setLikedSongs(safeSongs);
      setLikedAlbums(safeAlbums);
      setLikedPlaylists(safePlaylists);

      setList(safeSongs);


      // -----------------------------------------------
      // Spotify Tracks
      // -----------------------------------------------

      const tracks = safeSongs.filter((item) => {
        return (
          getSpotifyUrl(item) &&
          getSpotifyType(item) === "track"
        );
      });


      // -----------------------------------------------
      // Spotify Albums
      // -----------------------------------------------

      const spotifyAlbumItems = safeAlbums.filter(
        (item) => {
          return (
            getSpotifyUrl(item) &&
            getSpotifyType(item) === "album"
          );
        }
      );


      // -----------------------------------------------
      // Spotify Playlists
      // -----------------------------------------------

      const spotifyPlaylistItems =
        safePlaylists.filter((item) => {
          return (
            getSpotifyUrl(item) &&
            getSpotifyType(item) === "playlist"
          );
        });


      // -----------------------------------------------
      // Remove duplicates
      // -----------------------------------------------

      const uniqueTracks = Array.from(
        new Map(
          tracks.map((item, index) => [
            getItemKey(item, index),
            item,
          ])
        ).values()
      );

      const uniqueAlbums = Array.from(
        new Map(
          spotifyAlbumItems.map((item, index) => [
            getItemKey(item, index),
            item,
          ])
        ).values()
      );

      const uniquePlaylists = Array.from(
        new Map(
          spotifyPlaylistItems.map((item, index) => [
            getItemKey(item, index),
            item,
          ])
        ).values()
      );


      setSpotifyTracks(uniqueTracks);
      setSpotifyAlbums(uniqueAlbums);
      setSpotifyPlaylists(uniquePlaylists);

    } catch (error) {
      console.error(
        "Favourite loading error:",
        error
      );

      setLikedSongs([]);
      setLikedAlbums([]);
      setLikedPlaylists([]);

      setSpotifyTracks([]);
      setSpotifyAlbums([]);
      setSpotifyPlaylists([]);

      setList([]);
    }
  };


  // ==================================================
  // Load + update listeners
  // ==================================================

  useEffect(() => {
    loadFavourites();

    const handleStorage = () => {
      loadFavourites();
    };

    const handleFavouriteUpdate = () => {
      loadFavourites();
    };

    window.addEventListener(
      "storage",
      handleStorage
    );

    window.addEventListener(
      "favouritesUpdated",
      handleFavouriteUpdate
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage
      );

      window.removeEventListener(
        "favouritesUpdated",
        handleFavouriteUpdate
      );
    };
  }, []);


  // ==================================================
  // Scroll
  // ==================================================

  const scrollLeft = (ref) => {
    if (!ref?.current) return;

    ref.current.scrollBy({
      left: -700,
      behavior: "smooth",
    });
  };


  const scrollRight = (ref) => {
    if (!ref?.current) return;

    ref.current.scrollBy({
      left: 700,
      behavior: "smooth",
    });
  };


  // ==================================================
  // Spotify redirect
  // ==================================================

  const openSpotify = (item) => {
    const url = getSpotifyUrl(item);

    if (!url) return;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  };


  // ==================================================
  // Spotify Track Card
  // ==================================================

  const SpotifyTrack = ({ track, index }) => {
    const url = getSpotifyUrl(track);

    const name =
      track?.name ||
      track?.title ||
      "Spotify Track";

    const artistText = getArtists(
      track?.artists ||
        track?.artist ||
        track?.artists?.primary
    );

    return (
      <div
        className="
          flex
          items-center
          gap-3
          w-full
          min-w-0
          p-3
          rounded-xl
          border
          bg-[var(--card-bg)]
          border-[var(--card-border)]
          hover:bg-[var(--secondary-bg)]
          transition-all
        "
      >
        <img
          src={getImage(track)}
          alt={name}
          className="
            w-14
            h-14
            rounded-lg
            object-cover
            flex-shrink-0
          "
          onError={(event) => {
            event.currentTarget.src =
              "/Unknown.png";
          }}
        />

        <div className="flex-1 min-w-0">
          <h3
            className="
              font-semibold
              truncate
              text-[var(--text-primary)]
            "
          >
            {name}
          </h3>

          <p
            className="
              text-sm
              truncate
              text-[var(--text-secondary)]
            "
          >
            {artistText}
          </p>
        </div>

        {url && (
          <button
            type="button"
            onClick={() => openSpotify(track)}
            className="
              flex
              items-center
              justify-center
              gap-1
              px-3
              py-2
              rounded-full
              bg-[#1DB954]
              text-white
              hover:scale-105
              transition-transform
              flex-shrink-0
            "
            title="Open Spotify Track"
          >
            <FaSpotify />
            <span className="hidden sm:inline">
              Spotify
            </span>
          </button>
        )}
      </div>
    );
  };


  // ==================================================
  // Spotify Album Card
  // ==================================================

  const SpotifyAlbum = ({
    album,
    index,
  }) => {
    const url = getSpotifyUrl(album);

    return (
      <div
        key={getItemKey(album, index)}
        className="
          relative
          flex-shrink-0
        "
      >
        <AlbumItems {...album} />

        {url && (
          <button
            type="button"
            onClick={() => openSpotify(album)}
            className="
              absolute
              right-2
              bottom-2
              z-30
              flex
              items-center
              justify-center
              w-9
              h-9
              rounded-full
              bg-[#1DB954]
              text-white
              shadow-lg
              hover:scale-110
              transition-transform
            "
            title="Open Spotify Album"
          >
            <FaSpotify />
          </button>
        )}
      </div>
    );
  };


  // ==================================================
  // Spotify Playlist Card
  // ==================================================

  const SpotifyPlaylist = ({
    playlist,
    index,
  }) => {
    const url = getSpotifyUrl(playlist);

    return (
      <div
        key={getItemKey(playlist, index)}
        className="
          relative
          flex-shrink-0
        "
      >
        <PlaylistItems {...playlist} />

        {url && (
          <button
            type="button"
            onClick={() =>
              openSpotify(playlist)
            }
            className="
              absolute
              right-2
              bottom-2
              z-30
              flex
              items-center
              justify-center
              w-9
              h-9
              rounded-full
              bg-[#1DB954]
              text-white
              shadow-lg
              hover:scale-110
              transition-transform
            "
            title="Open Spotify Playlist"
          >
            <FaSpotify />
          </button>
        )}
      </div>
    );
  };


  // ==================================================
  // Empty state
  // ==================================================

  const hasFavourites =
    likedSongs.length > 0 ||
    likedAlbums.length > 0 ||
    likedPlaylists.length > 0 ||
    spotifyTracks.length > 0 ||
    spotifyAlbums.length > 0 ||
    spotifyPlaylists.length > 0;


  // ==================================================
  // JSX
  // ==================================================

  return (
    <>
      <Navbar />

      <main
        className="
          min-h-screen
          flex
          flex-col
          gap-8
          pb-[12rem]
          pt-[7rem]
          bg-[var(--background)]
          text-[var(--text-primary)]
        "
      >

        {/* ============================================
            HEADER
        ============================================ */}

        <div
          className="
            flex
            items-center
            gap-5
            ml-5
            lg:ml-12
          "
        >
          <div
            className="
              flex
              justify-center
              items-center
              w-32
              h-32
              lg:w-48
              lg:h-48
              rounded-xl
              bg-[var(--card-bg)]
              border
              border-[var(--card-border)]
            "
          >
            <FaHeart
              className="
                text-5xl
                lg:text-7xl
                text-[#1DB954]
              "
            />
          </div>

          <h1
            className="
              text-3xl
              lg:text-4xl
              font-bold
              text-[var(--text-primary)]
            "
          >
            My Favourite
          </h1>
        </div>


        {/* ============================================
            LIKED SONGS
        ============================================ */}

        {likedSongs.length > 0 && (
          <section>
            <h2
              className="
                text-2xl
                font-semibold
                px-5
                py-3
                text-[var(--text-primary)]
              "
            >
              Liked Songs
            </h2>

            <div className="flex flex-wrap">
              {likedSongs.map(
                (song, index) =>
                  song && (
                    <SongsList
                      key={getItemKey(
                        song,
                        index
                      )}
                      id={song.id}
                      image={song.image}
                      artists={song.artists}
                      name={song.name}
                      duration={song.duration}
                      downloadUrl={
                        song.audio ||
                        song.downloadUrl
                      }
                      song={list}
                    />
                  )
              )}
            </div>
          </section>
        )}


        {/* ============================================
            SPOTIFY TRACKS
        ============================================ */}

        {spotifyTracks.length > 0 && (
          <section className="px-4 lg:px-8">
            <div
              className="
                flex
                items-center
                justify-between
                mb-3
              "
            >
              <h2
                className="
                  text-2xl
                  font-semibold
                  text-[var(--text-primary)]
                "
              >
                Spotify Tracks
              </h2>

              <FaSpotify
                className="
                  text-2xl
                  text-[#1DB954]
                "
              />
            </div>

            <div
              className="
                grid
                grid-cols-1
                md:grid-cols-2
                xl:grid-cols-3
                gap-3
              "
            >
              {spotifyTracks.map(
                (track, index) => (
                  <SpotifyTrack
                    key={getItemKey(
                      track,
                      index
                    )}
                    track={track}
                    index={index}
                  />
                )
              )}
            </div>
          </section>
        )}


        {/* ============================================
            LIKED ALBUMS
        ============================================ */}

        {likedAlbums.length > 0 && (
          <section>
            <h2
              className="
                text-2xl
                font-semibold
                px-5
                py-3
                text-[var(--text-primary)]
              "
            >
              Liked Albums
            </h2>

            <div
              className="
                relative
                flex
                items-center
                mx-1
                lg:mx-8
              "
            >
              <button
                type="button"
                className="
                  arrow-btn
                  absolute
                  left-0
                  z-20
                  hidden
                  lg:flex
                  items-center
                  justify-center
                  w-10
                  h-36
                  text-3xl
                  cursor-pointer
                "
                onClick={() =>
                  scrollLeft(
                    albumsScrollRef
                  )
                }
                aria-label="Previous albums"
              >
                <MdOutlineKeyboardArrowLeft />
              </button>

              <div
                ref={albumsScrollRef}
                className="
                  flex
                  gap-3
                  overflow-x-auto
                  scroll-hide
                  scroll-smooth
                  w-full
                  px-3
                "
              >
                {likedAlbums.map(
                  (album, index) => (
                    <div
                      key={getItemKey(
                        album,
                        index
                      )}
                      className="flex-shrink-0"
                    >
                      <AlbumItems
                        {...album}
                      />
                    </div>
                  )
                )}
              </div>

              <button
                type="button"
                className="
                  arrow-btn
                  absolute
                  right-0
                  z-20
                  hidden
                  lg:flex
                  items-center
                  justify-center
                  w-10
                  h-36
                  text-3xl
                  cursor-pointer
                "
                onClick={() =>
                  scrollRight(
                    albumsScrollRef
                  )
                }
                aria-label="Next albums"
              >
                <MdOutlineKeyboardArrowRight />
              </button>
            </div>
          </section>
        )}


        {/* ============================================
            SPOTIFY ALBUMS
        ============================================ */}

        {spotifyAlbums.length > 0 && (
          <section>
            <div
              className="
                flex
                items-center
                justify-between
                px-5
                py-3
              "
            >
              <h2
                className="
                  text-2xl
                  font-semibold
                  text-[var(--text-primary)]
                "
              >
                Spotify Albums
              </h2>

              <FaSpotify
                className="
                  text-2xl
                  text-[#1DB954]
                "
              />
            </div>

            <div
              className="
                relative
                flex
                items-center
                mx-1
                lg:mx-8
              "
            >
              <button
                type="button"
                className="
                  arrow-btn
                  absolute
                  left-0
                  z-20
                  hidden
                  lg:flex
                  items-center
                  justify-center
                  w-10
                  h-36
                  text-3xl
                  cursor-pointer
                "
                onClick={() =>
                  scrollLeft(
                    spotifyAlbumsScrollRef
                  )
                }
                aria-label="Previous Spotify albums"
              >
                <MdOutlineKeyboardArrowLeft />
              </button>

              <div
                ref={
                  spotifyAlbumsScrollRef
                }
                className="
                  flex
                  gap-3
                  overflow-x-auto
                  scroll-hide
                  scroll-smooth
                  w-full
                  px-3
                "
              >
                {spotifyAlbums.map(
                  (album, index) => (
                    <SpotifyAlbum
                      key={getItemKey(
                        album,
                        index
                      )}
                      album={album}
                      index={index}
                    />
                  )
                )}
              </div>

              <button
                type="button"
                className="
                  arrow-btn
                  absolute
                  right-0
                  z-20
                  hidden
                  lg:flex
                  items-center
                  justify-center
                  w-10
                  h-36
                  text-3xl
                  cursor-pointer
                "
                onClick={() =>
                  scrollRight(
                    spotifyAlbumsScrollRef
                  )
                }
                aria-label="Next Spotify albums"
              >
                <MdOutlineKeyboardArrowRight />
              </button>
            </div>
          </section>
        )}


        {/* ============================================
            LIKED PLAYLISTS
        ============================================ */}

        {likedPlaylists.length > 0 && (
          <section>
            <h2
              className="
                text-2xl
                font-semibold
                px-5
                py-3
                text-[var(--text-primary)]
              "
            >
              Liked Playlists
            </h2>

            <div
              className="
                relative
                flex
                items-center
                mx-1
                lg:mx-8
              "
            >
              <button
                type="button"
                className="
                  arrow-btn
                  absolute
                  left-0
                  z-20
                  hidden
                  lg:flex
                  items-center
                  justify-center
                  w-10
                  h-36
                  text-3xl
                  cursor-pointer
                "
                onClick={() =>
                  scrollLeft(
                    playlistsScrollRef
                  )
                }
                aria-label="Previous playlists"
              >
                <MdOutlineKeyboardArrowLeft />
              </button>

              <div
                ref={playlistsScrollRef}
                className="
                  flex
                  gap-3
                  overflow-x-auto
                  scroll-hide
                  scroll-smooth
                  w-full
                  px-3
                "
              >
                {likedPlaylists.map(
                  (playlist, index) => (
                    <div
                      key={getItemKey(
                        playlist,
                        index
                      )}
                      className="flex-shrink-0"
                    >
                      <PlaylistItems
                        {...playlist}
                      />
                    </div>
                  )
                )}
              </div>

              <button
                type="button"
                className="
                  arrow-btn
                  absolute
                  right-0
                  z-20
                  hidden
                  lg:flex
                  items-center
                  justify-center
                  w-10
                  h-36
                  text-3xl
                  cursor-pointer
                "
                onClick={() =>
                  scrollRight(
                    playlistsScrollRef
                  )
                }
                aria-label="Next playlists"
              >
                <MdOutlineKeyboardArrowRight />
              </button>
            </div>
          </section>
        )}


        {/* ============================================
            SPOTIFY PLAYLISTS
        ============================================ */}

        {spotifyPlaylists.length > 0 && (
          <section>
            <div
              className="
                flex
                items-center
                justify-between
                px-5
                py-3
              "
            >
              <h2
                className="
                  text-2xl
                  font-semibold
                  text-[var(--text-primary)]
                "
              >
                Spotify Playlists
              </h2>

              <FaSpotify
                className="
                  text-2xl
                  text-[#1DB954]
                "
              />
            </div>

            <div
              className="
                relative
                flex
                items-center
                mx-1
                lg:mx-8
              "
            >
              <button
                type="button"
                className="
                  arrow-btn
                  absolute
                  left-0
                  z-20
                  hidden
                  lg:flex
                  items-center
                  justify-center
                  w-10
                  h-36
                  text-3xl
                  cursor-pointer
                "
                onClick={() =>
                  scrollLeft(
                    spotifyPlaylistsScrollRef
                  )
                }
                aria-label="Previous Spotify playlists"
              >
                <MdOutlineKeyboardArrowLeft />
              </button>

              <div
                ref={
                  spotifyPlaylistsScrollRef
                }
                className="
                  flex
                  gap-3
                  overflow-x-auto
                  scroll-hide
                  scroll-smooth
                  w-full
                  px-3
                "
              >
                {spotifyPlaylists.map(
                  (playlist, index) => (
                    <SpotifyPlaylist
                      key={getItemKey(
                        playlist,
                        index
                      )}
                      playlist={playlist}
                      index={index}
                    />
                  )
                )}
              </div>

              <button
                type="button"
                className="
                  arrow-btn
                  absolute
                  right-0
                  z-20
                  hidden
                  lg:flex
                  items-center
                  justify-center
                  w-10
                  h-36
                  text-3xl
                  cursor-pointer
                "
                onClick={() =>
                  scrollRight(
                    spotifyPlaylistsScrollRef
                  )
                }
                aria-label="Next Spotify playlists"
              >
                <MdOutlineKeyboardArrowRight />
              </button>
            </div>
          </section>
        )}


        {/* ============================================
            EMPTY
        ============================================ */}

        {!hasFavourites && (
          <div
            className="
              mx-5
              rounded-xl
              border
              border-[var(--card-border)]
              bg-[var(--card-bg)]
              px-6
              py-10
              text-center
              text-lg
              text-[var(--text-secondary)]
            "
          >
            No Liked Songs, Albums, or Playlists.
          </div>
        )}

      </main>

      <Navigator />
    </>
  );
};

export default Favourite;
