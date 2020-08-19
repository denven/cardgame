// This file is for socket events common amongst all games

const queryObj = {
	// Gets the jwt token from cookies
	token: document.cookie.replace(/(?:(?:^|.*;\s*)jwt\s*\=\s*([^;]*).*$)|^.*$/, "$1"), // user name
	uuid: window.location.pathname.split("/")[2], // uuid
};

console.log("Socket io connect:", queryObj);

const socket = io({ query: queryObj });
