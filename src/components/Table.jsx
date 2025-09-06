
export function Table({columns=[], rows=[]}){
  return (
    <div style={{overflowX:'auto'}}>
      <table>
        <thead><tr>{columns.map(c => <th key={c.key||c.header}>{c.header}</th>)}</tr></thead>
        <tbody>
          {rows.length===0 ? <tr><td colSpan={columns.length} className="small">No data</td></tr> : rows.map((r,i)=>(
            <tr key={i}>{columns.map(c => <td key={c.key||c.header}>{c.render? c.render(r): r[c.key]}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
