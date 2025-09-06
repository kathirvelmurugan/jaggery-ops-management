
import { useStore } from '../store/store'
import { Field } from '../components/Field'
import { Button } from '../components/Button'
import { Table } from '../components/Table'
import { useState } from 'react'

function SimpleCrud({label, keyName}){
  const items = useStore(s => s[keyName])
  const addItem = useStore(s => s.addItem)
  const removeItem = useStore(s => s.removeItem)
  const [name, setName] = useState('')

  return (
    <div className="panel">
      <h2>{label}</h2>
      <div className="row">
        <div style={{flex:1}}>
          <Field label="Name">
            <input value={name} onChange={e=>setName(e.target.value)} placeholder={`Add ${label} name`} />
          </Field>
        </div>
        <Button className="primary" onClick={()=>{
          if(!name.trim()) return
          addItem(keyName, { name })
          setName('')
        }}>Add</Button>
      </div>
      <Table columns={[{header:'Name', key:'name'}, {header:'', render:(r)=><Button onClick={()=>removeItem(keyName, r.id)}>Delete</Button>}]} rows={items} />
    </div>
  )
}

export default function MasterData(){
  return (
    <div className="grid grid-2">
      <SimpleCrud label="Products" keyName="products" />
      <SimpleCrud label="Warehouses" keyName="warehouses" />
      <SimpleCrud label="Farmers" keyName="farmers" />
      <SimpleCrud label="Customers" keyName="customers" />
    </div>
  )
}
