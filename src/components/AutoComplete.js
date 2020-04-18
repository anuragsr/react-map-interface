import React, { Component } from 'react'
import Autosuggest from 'react-autosuggest'
import HttpService from '../services/HttpService'
import { l, auth } from '../helpers/common'

export default class AutoComplete extends Component {
  constructor(props) {
    super(props)
    let value = this.props.inputProps.value
    this.http = new HttpService()
    this.state = {
      showSearch: false,
      value: value ? value: "",
      suggestions: [],
    }
  }
  
  getSuggestionValue = suggestion => {
    return suggestion.full_name
  }
  
  renderSuggestion = (suggestion, { query }) => {
    let suggestionText = `${suggestion.full_name}`

    return (
      <div>
        { 
          suggestion.image ? 
          <img className="tag-img" src={suggestion.image} alt="" /> :
          <img className="tag-img" src="assets/tag-plh.png" alt="" />
        }        
        { suggestionText }
      </div>
    )
  }

  getSuggestions = value => {
    let url = '/api/v1/tags', 
    params = {
      query: value,
      series: true,
    }

    this.http
    .get(url, params, auth)
    .then(res => {
      const currRes = res.data.results
      let suggestions      
      l("Total API Results:", currRes)

      suggestions = currRes.filter(x => x.full_name.toLowerCase().includes(value.toLowerCase()))      
      l("Results containing current query:", suggestions)

      // To set filtered options 
      // this.setState({ suggestions })

      // To set all options 
      this.setState({ suggestions: currRes })
        
      if(this.props.getCurrSugg) this.props.getCurrSugg(currRes)
    })
    .catch(error => {
      // error callback
      l(error)
    })
  }

  onChange = (event, { newValue }) => {    
    this.setState({ value: newValue })
    if (this.props.inputChanged) this.props.inputChanged(newValue)
  }

  onSuggestionsFetchRequested = ({ value }) => {
    if(value.trim() !== "") this.getSuggestions(value)
  }

  onSuggestionsClearRequested = () => this.setState({ suggestions: [] })

  onSuggestionSelected = (event, { suggestion, suggestionValue, suggestionIndex, sectionIndex, method }) => {
    // l({ suggestion, suggestionValue, suggestionIndex, sectionIndex, method })
    this.props.optionSelected(suggestion, method)
    this.setState({ suggestions: [], value: "" })
  }

  shouldRenderSuggestions = value => typeof value !== "undefined" && value.trim().length > 0  
  
  storeInputReference = autosuggest => {
    if (autosuggest !== null) this.input = autosuggest.input    
  }

  toggleSearch = () => {
    this.setState({ showSearch: !this.state.showSearch }, () => {
      if (this.state.showSearch) this.input.focus()
    })
  }
  
  render() {
    const { value, suggestions } = this.state
    let inputProps = this.props.inputProps
        
    inputProps.value = value
    inputProps.onChange = this.onChange    
    inputProps.className = `search-box tag-inp ${this.state.showSearch ? "" : "closed"}`

    return (
      <>
        <div className="ctn-icon icon-search-tag" onClick={this.toggleSearch}>
          <img src="assets/search-tag.jpg" alt="" />
        </div>
        <Autosuggest
          onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
          onSuggestionsClearRequested={this.onSuggestionsClearRequested}
          onSuggestionSelected={this.onSuggestionSelected}
          getSuggestionValue={this.getSuggestionValue}
          renderSuggestion={this.renderSuggestion}
          ref={this.storeInputReference}
          highlightFirstSuggestion={false}
          suggestions={suggestions}
          inputProps={inputProps}
        />
      </>
    )
  }
}