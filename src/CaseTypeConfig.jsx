import { T, ROLES, ROLE_PERMISSIONS } from '../../data.js'

const ALL_PERMISSIONS = [
  { id:'cases:read',      label:'View Cases'         },
  { id:'cases:read:own',  label:'View Own Cases'     },
  { id:'cases:write',     label:'Edit Cases'         },
  { id:'cases:create',    label:'Create Cases'       },
  { id:'cases:assign',    label:'Assign Cases'       },
  { id:'reports:read',    label:'View Reports'       },
  { id:'employers:read',  label:'View Employers'     },
  { id:'workflow:read',   label:'View Workflows'     },
  { id:'admin:users',     label:'Manage Users'       },
  { id:'admin:roles',     label:'Manage Roles'       },
  { id:'admin:config',    label:'System Config'      },
]

export default function RolesPage() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, animation:'fadeIn .3s ease' }}>
      <h1 style={{ fontSize:20, fontWeight:800, color:T.text, margin:0 }}>Roles & Permissions</h1>
      <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${T.border}`, overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:800 }}>
            <thead>
              <tr style={{ background:'#f9fafb', borderBottom:`1px solid ${T.border}` }}>
                <th style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.5px', minWidth:160 }}>Permission</th>
                {ROLES.map(r => (
                  <th key={r.id} style={{ padding:'12px 10px', textAlign:'center', fontSize:11, fontWeight:700, color:r.color, minWidth:100 }}>
                    {r.label.split(' ').join('\n')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_PERMISSIONS.map((perm, i) => (
                <tr key={perm.id} style={{ borderBottom:`1px solid #f3f4f6`, background:i%2===0?'#fff':'#fafafa' }}>
                  <td style={{ padding:'10px 16px', fontSize:13, color:T.text, fontWeight:500 }}>{perm.label}</td>
                  {ROLES.map(r => {
                    const perms = ROLE_PERMISSIONS[r.id] || []
                    const has = perms.includes('all') || perms.includes(perm.id)
                    return (
                      <td key={r.id} style={{ padding:'10px', textAlign:'center' }}>
                        {has
                          ? <span style={{ fontSize:16, color:'#059669' }}>✓</span>
                          : <span style={{ fontSize:14, color:'#e5e7eb' }}>—</span>
                        }
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ background:'#f0f7f3', borderRadius:10, padding:14, fontSize:12, color:T.green }}>
        <strong>Note:</strong> Permissions are configurable per role. The Master Administrator has unrestricted access to all functions. Contact your system administrator to modify role permissions.
      </div>
    </div>
  )
}
