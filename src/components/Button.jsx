
export function Button({children, ...props}){
  return <button className={"btn " + (props.variant||'')} {...props}>{children}</button>
}
