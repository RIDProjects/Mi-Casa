// Punto único de resolución de la casa activa del usuario autenticado.
// Antes cada controller reimplementaba esto con distinto nivel de fallback
// (algunos solo usaban req.user.house?.id, otros la cadena completa) —
// un usuario multi-casa con `house` sin poblar pero `activeHouseId` seteado
// veía listas vacías en algunos endpoints y no en otros.
export function resolveHouseId(user: any): string {
  return user?.house?.id ?? user?.activeHouseId ?? user?.houses?.[0]?.id ?? '';
}
