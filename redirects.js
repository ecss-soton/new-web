module.exports = async () => {
  const internetExplorerRedirect = {
    source: '/:path((?!ie-incompatible.html$).*)', // all pages except the incompatibility page
    has: [
      {
        type: 'header',
        key: 'user-agent',
        value: '(.*Trident.*)', // all ie browsers
      },
    ],
    permanent: false,
    destination: '/ie-incompatible.html',
  }

  const movedGameRoutes = [
    { source: '/wordle', destination: '/games/wordle', permanent: true },
    { source: '/wordle/leaderboard', destination: '/games/wordle/leaderboard', permanent: true },
  ]

  return [internetExplorerRedirect, ...movedGameRoutes]
}
