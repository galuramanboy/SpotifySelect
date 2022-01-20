import { React, ReactDOM } from 'https://unpkg.com/es-react@16.8.60/index.js';
import htm from 'https://unpkg.com/htm@2.2.1/dist/htm.mjs';
import { useQuery, getPathParams } from './utils.js';

const { useEffect, useState, useRef } = React;

/**
function getImage(node) {
    return node?.images?.at(0)?.url;
}
**/

function Search({ searchParams }) {
    const [searchTerm, setSearchTerm] = useState("");
    // const [queue, setQueue] = useState([]);
    const setQueue = () => { };
    const { data, refetch } = useQuery(`/api/spotify/search?q=${searchTerm}&type=track`);
    const venue = getPathParams("/venue/:id");
    console.log(venue.id);
    const { data: queueFromDB, refetch: refetchVenueQueue } = useQuery(`/api/venue/${venue.id}/queue`);
    const { data: queue, refetch: refetchTracks } = useQuery(`/api/spotify/tracks?ids=${queueFromDB?.map?.(queue_item => queue_item.song_id).join(',')}`);
    const { data: queueAdded, refetch: refetchAddQueue} = useQuery(`/api/venue/${venue.id}/queue`);
    console.log({queueFromDB});
    console.log({queue});
    console.log({queueAdded});

    // const { data, refetch } = useQuery(`/api/spotify/search?q=${searchTerm}&type=track`);
    const InputRef = useRef(null);

    useEffect(() => {
        if (searchTerm) {
            refetch();
        }
    }, [searchTerm])

    useEffect(() => {
        refetchVenueQueue();
        const interval = setInterval(() => {
            refetchVenueQueue();
        }, 1000);
        return () => {
            clearInterval(interval); 
        }
    }, []);

    useEffect(() => {
        if ((queueFromDB?.length ?? 0) > 0) {
            refetchTracks();
        }
    }, [queueFromDB?.map?.(x => x.song_id).join(",")])

    return html`
    <div>
        <img src="/img/pic.png" className="app-hero-image"/>
        <div className="app-main">
            <div className="app-playlist">
                <h2>${queue?.tracks ? "Playing Now" : "Queue List"}</h2>
                ${queue?.tracks?.map?.(
            /** 
            * @arg {import("./example_data/track.json")} track */
            (track, i) => {
                return html`
                                <div className="list-item" key=${queueFromDB?.[i]?.id}>
                                        <div className="list-item-rank">${i + 1}</div>
                                        <img className="list-item-image" src="${track?.album?.images?.at(0)?.url}"/>
                                        <div className="list-item-info">
                                            <div className="list-item-track">${track?.name}</div>
                                            <div className="list-item-artist">${track?.artists?.at(0)?.name}</div>
                                        </div>
                                        <div className="list-item-add" onClick=${async () => {
                        const queueId = queueFromDB?.[i]?.id;
                        if (queueId) {
                            await fetch(`/api/queue/${queueId}`, {
                                method: "DELETE"
                            });
                            await refetchVenueQueue();
                        }
                    }}>x</div>
                                </div>
                                `;
            }) ?? html`<div className="Text_filler">Add a song!</div>`}
            </div>
            <div className="app-search">
                <div className="search-bar">

                    <!--
                    <label>Search Songs: </label>
                    -->

                    <input type="text" ref=${InputRef}/>

                    <!--
                    <button onClick=${() => {
                setSearchTerm(InputRef.current.value);
            }}>Search</button>
                    -->

                    <button type="button" className="btn btn-primary" onClick=${() => {
                setSearchTerm(InputRef.current.value);
            }}>Search</button>

                </div>
                <div>
                <!--
                <h2>Search Results</h2>
                -->
                    ${data?.tracks?.items?.map?.(
                /** 
                * @arg {import("./example_data/track.json")} track */
                (track, i) => {
                    return html`
                                <div className="list-item" key=${track.id}>
                                        <img className="list-item-image" src="${track?.album?.images?.at(0)?.url}"/>
                                        <div className="list-item-info">
                                            <div className="list-item-track">${track?.name}</div>
                                            <div className="list-item-artist">${track?.artists?.at(0)?.name}</div>
                                        </div>
                                        <div className="add-button list-item-add btn btn-primary" onClick=${async () => {
                        await fetch(`/api/queue/venue/${venue.id}/song/${track.id}`, {
                            method: "POST"
                        });
                        await refetchVenueQueue();
                        }}>Add Song</div>
                                </div>
                                `;
                }) ?? html`<div className="Text_filler">Search some songs!</div>`}
                </div>
            </div>
        </div>
    </div>
    `
}

const html = htm.bind(React.createElement);
function SayHello() {
    const { data: user, refetch } = useQuery("/api/me");
    useEffect(() => {
        refetch();
    }, []);
    return html`
    <div>
        <${Search} />
    </div>
    `;
}
ReactDOM.render(html`<${SayHello} />`, document.getElementById("app"));
// Say Hello is returning a div HTML, which inherits more html from the Search
// function
