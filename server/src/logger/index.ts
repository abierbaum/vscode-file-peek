import { RemoteConsole } from "vscode-languageserver/lib/main";

export let console: RemoteConsole = null;
export function create(nConsole: RemoteConsole) {
  console = nConsole;
}