import axios from 'axios'

const apiHost = 'https://api-admin-staging.oyster.ai'
let call

export default class HttpService {  
  get(url, params, auth) {
    let config = {
      method: "get",
      url: apiHost + url,
      params,
      auth
    }

    return this.doRequest(config)
  }

  delete(url, params, auth) {
    let config = {
      method: "delete",
      url: apiHost + url,
      params,
      auth
    }

    return this.doRequest(config)
  }
  
  post(url, data, auth, onUploadProgress) {
    let config = {
      method: "post",
      url: apiHost + url,
      data,
      auth,
      onUploadProgress
    }
    
    return this.doRequest(config)
  }

  put(url, data, auth, onUploadProgress) {
    let config = {
      method: "put",
      url: apiHost + url,
      data,
      auth,
      onUploadProgress
    }
    return this.doRequest(config)
  }
  
  doRequest = config => {
    // l(config)
    if (config.params && config.params.series){
      delete config.params.series
      if(call){
        call.cancel('One request at a time, fellas!')
      }
      call = axios.CancelToken.source()
      config.cancelToken = call.token
    }
    return axios(config)
  }
}