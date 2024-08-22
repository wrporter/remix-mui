import {
    Links,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration,
} from "@remix-run/react";

import {getMuiLinks} from "./mui/getMuiLinks";
import {MuiMeta} from "./mui/MuiMeta";
import {json, LinksFunction, LoaderFunctionArgs} from "@remix-run/node";
import {MuiDocument} from "./mui/MuiDocument";
import {ClientHintCheck, getHints} from '~/utils/client-hints.js';

export const links: LinksFunction = () => [...getMuiLinks()];

export function Layout({children}: { children: React.ReactNode }) {
    return (
        <html lang="en">
        <head>
            <ClientHintCheck />
            <meta charSet="utf-8"/>
            <meta name="viewport" content="width=device-width, initial-scale=1"/>
            <Meta/>
            <MuiMeta/>
            <Links/>
        </head>
        <body>
        {children}
        <ScrollRestoration/>
        <Scripts/>
        </body>
        </html>
    );
}

export default function App() {
    return (
        <>
            <MuiDocument>
                    <Outlet/>
            </MuiDocument>
        </>
    );
}



export async function loader({ request }: LoaderFunctionArgs) {
    return json(
      {
          requestInfo: {
              hints: getHints(request),
          },
      },
    )
}
