module.exports = {
  server: {
    external: {
      scoreboard:
        require.resolve("@multi-indiegame/akashic-scoreboard-serve/server.js"),
    },
  },
  client: {
    external: {
      scoreboard: require.resolve("@multi-indiegame/akashic-scoreboard-serve"),
    },
  },
};
