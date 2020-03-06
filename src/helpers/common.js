export let auth = { username: "", password: "" }
// export const l = console.log.bind(window.console)
export const l = () => {}
export const cl = console.clear.bind(window.console)
export const rand = length => {
  let chars = 'M30Z1xA0Nu5Pn8Yo2pXqB5Rly9Gz3vWOj1Hm46IeCfgSrTs7Q9aJb8F6DcE7d2twkUhKiL4V'
  , charLength = chars.length
  , randomStr = ''
  for (let i = 0; i < length; i++) {
    randomStr+= chars[Math.floor(Math.random() * (charLength - 1))]
  }
  return randomStr
}
export const randBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
export const sp = e => e && e.stopPropagation()
export const pd = e => e && e.preventDefault()
export const generateColor = () => {
  const letters = '0123456789ABCDEF'
  let color = '#'
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)]
  }
  return color
}