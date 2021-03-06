import { React, ReactDOM } from 'https://unpkg.com/es-react@16.8.60/index.js';
import htm from 'https://unpkg.com/htm@2.2.1/dist/htm.mjs';

const { useEffect, useState, useRef } = React;
// Server stuff?

/** Get some data from a server
 * @param  {Parameters<typeof fetch>} args 
 */
async function get(...args) {
    return fetch(...args).then(res => res.json());
}

/**
 * 
 * @param  {Parameters<typeof fetch>} args 
 * @returns {{error: any, data: any}}
 */
export function useQuery(...args) {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const refetch = () => get(...args).then((data) => {
        setData(data);
    }).catch(setError);
    return {data, error, refetch};
}

/**
 * @param {string} pattern 
 * @returns 
 */
export function getPathParams(pattern) {
    return Object.fromEntries(pattern.split("/").map((x, i) => {
        return [x, i];
    }).filter(([path, i]) => path.startsWith(":")).map(([param, i]) => {
        const finalParam = param.replace(":", "");
        return [finalParam, i];
    }).map(([param, i]) => [param, window.location.pathname.split("/")?.[i]]));
}
