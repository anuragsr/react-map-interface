import React, { Component } from 'react'
import Cookies from 'universal-cookie'

import Background from './components/Background'
import MapComponent from './components/MapComponent'
import HttpService from './services/HttpService'
import { l, auth, pd } from './helpers/common'

import './scss/app.scss'

const cookies = new Cookies()

export default class App extends Component {
  constructor(props) {
    super(props)
    this.http = new HttpService()
    this.state = {
      username: "",
      password: "",
      isAuth: false,
      showErr: false,
    }
  }

  componentDidMount() {
    let ck = cookies.get("map_int_con")
    if (typeof ck !== "undefined") {
      this.setState({
        username: ck.x_u,
        password: ck.x_p
      }, this.login)
    }
    // else {
    //   this.setState({
    //     username: 'contenter',
    //     password: 'ExXgB6QjfQUwyMm7gcEd'
    //   }, this.login)
    // }
  }

  handleInputChange = event => {
    const target = event.target
    const value = target.value
    this.setState({
      [target.name]: value
    })
  }

  login = e => {
    pd(e)
    // l(this.state)
    this.http
      .post('/api/v1/login', {
        username: this.state.username,
        password: this.state.password,
        editor_page: true
      })
      .then(res => {
        l(res)

        // Set auth user
        auth.username = this.state.username
        auth.password = this.state.password

        let ck = cookies.get("map_int_con")
        if (typeof ck === "undefined") {
          cookies.set("map_int_con", {
            x_u: auth.username,
            x_p: auth.password
          }, { maxAge: 3600 })
        }
        // l(auth)

        this.setState({ isAuth: true })
      })
      .catch(err => {
        l(err)
        this.setState({ showErr: true })
        setTimeout(() => {
          this.setState({ showErr: false })
        }, 3000)
      })
  }

  logout = () => {
    cookies.remove("map_int_con")
    this.setState({
      isAuth: false,
      username: "",
      password: ""
    })
  }

  render() {
    return (
      <>
        {!this.state.isAuth && <div className="h-100">
          <Background />
          <div className="login-outer">
            <div className="login-box">
              <form onSubmit={this.login}>
                <div className="login-content">
                  <img src="assets/steakhouse.svg" alt="" />
                  <div className="heading">Welcome to Project!</div>
                  <input name="username" value={this.state.username} onChange={this.handleInputChange} placeholder="Login" type="text" />
                  <input name="password" value={this.state.password} onChange={this.handleInputChange} placeholder="Password" type="password" />
                  <button className="btn-accent" type="submit">Sign in</button>
                </div>
              </form>
              {this.state.showErr &&
                <div className="error-content">
                  <div className="err">Error</div>
                  <div>Please enter a valid email and password</div>
                </div>}
            </div>
          </div>
        </div>}
        {this.state.isAuth && <div className="h-100">
          <MapComponent logout={this.logout} />
        </div>}
        {/* <MapComponent/> */}
      </>
    )
  }
}
