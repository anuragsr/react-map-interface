import React, { Component } from 'react'
import { l } from '../helpers/common'

export default class SearchBox extends Component {  
  static defaultProps = {
    placeholder: 'Search for places...',
    onPlacesChanged: null,
  }

  constructor(props) {
    super(props)
    this.searchInput = React.createRef()
    this.state = {
      showSearch: false
    }
  }

  componentDidMount() {
    const {
      mapsApi: { places },
    } = this.props
    this.searchBox = new places.SearchBox(this.searchInput.current)
    this.searchBox.addListener('places_changed', this.onPlacesChanged)
  }

  componentWillUnmount() {
    const {
      mapsApi: { event },
    } = this.props
    event.clearInstanceListeners(this.searchBox)
  }

  onPlacesChanged = () => this.props.onPlacesChanged(this.searchBox.getPlaces())
  
  toggleSearch = () => this.setState({ showSearch: !this.state.showSearch })

  render() {
    return (
      <>
        <input
          ref={this.searchInput}
          placeholder={this.props.placeholder}
          type="text"
          className={`search-box ${this.state.showSearch ? "" : "closed"}`}
        />
        <div className="ctn-icon icon-search" onClick={this.toggleSearch}>
          <img src="assets/search.jpg" alt=""/>
        </div>
      </>
    )
  }
}