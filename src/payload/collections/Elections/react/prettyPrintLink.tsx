import React, { Fragment, useCallback, useEffect, useState } from 'react'
import { useDocumentInfo } from 'payload/dist/admin/components/utilities/DocumentInfo'

export const PrettyPrintLink: () => JSX.Element = () => {
  const { id } = useDocumentInfo()

  const [data, setData] = useState({ totalVotes: 0, totalVoters: 0, electionResult: [] })
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      const result = await fetch(`/api/elections/${id}/results`)
      const resultData = await result.json()

      if (resultData.electionFinished === false) {
        setError('The results are unavailable until the election has ended.')
        return
      }

      if (!result.ok || !resultData.success) {
        setError(`Failed to fetch results: ${result.statusText}`)
        return
      }

      setData({
        totalVotes: resultData.totalVotes,
        totalVoters: resultData.totalVoters,
        electionResult: resultData.electionResult.map(i => {
          if (!i.electedNominee) {
            return `${i.position.name}: RON`
          }
          const nomineesName = i.electedNominee.nominees.map(n => n.name).join(', ')
          const name = i.electedNominee.nickname
            ? `${i.electedNominee.nickname} - ${nomineesName}`
            : nomineesName
          return `${i.position.name}: ${name}`
        }),
      })
    }

    fetchData()
  }, [data])

  if (error) {
    return <p>{error}</p>
  }

  return (
    <Fragment>
      <h3>Results</h3>
      <p>
        The turnout was {data.totalVotes} votes from {data.totalVoters} voters in total. The results
        are:
      </p>
      <ol>
        {data.electionResult.map(i => (
          <li key={i}>{i}</li>
        ))}
      </ol>
    </Fragment>
  )
}
