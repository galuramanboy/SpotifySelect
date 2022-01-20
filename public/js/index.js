import { React, ReactDOM } from 'https://unpkg.com/es-react@16.8.60/index.js';
import htm from 'https://unpkg.com/htm@2.2.1/dist/htm.mjs';
import { useQuery } from './utils.js';

const { useEffect, useState, useRef } = React;

const html = htm.bind(React.createElement);
function SayHello() {
    const { data: venues, refetch } = useQuery("/api/venue");
    useEffect(() => {
        refetch();
        const interval = setInterval(() => {
            refetch();
        }, 1000);
        return () => {
            clearInterval(interval);
        }
    }, []);
    return html`
    <div>
        ${venues?.map?.(venue => (html`<a className="for-button" href="/venue/${venue.id}"><div className="list-item venue-item"><span className="list-item-info">${venue.venue_name}</span><button className="add-button venue-item-delete list-item-add btn btn-primary" onClick=${
        async (event) => {
            await fetch(`/api/venue/${venue.id}`, { method: "DELETE" })
            await refetch();
            event.stopPropogation();
            event.preventDefault();
        }}>Delete Venue</button></div></a>`))}
    </div>
    `;
}
ReactDOM.render(html`<${SayHello} />`, document.getElementById("app"));
// Say Hello is returning a div HTML, which inherits more html from the Search
// function
