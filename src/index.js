import React from "react";
import ReactDOM from "react-dom";
import { ApolloClient } from "apollo-client";
import { createHttpLink } from "apollo-link-http";
import { setContext } from "apollo-link-context";
import { InMemoryCache } from "apollo-cache-inmemory";
import { ApolloProvider, Query } from "react-apollo";
import gql from "graphql-tag";
import "./index.css";
import { BrowserRouter, Route, Switch, Link } from 'react-router-dom';

const httpLink = createHttpLink({
  uri: "https://api.github.com/graphql"
});

const authLink = setContext((_, { headers }) => {
  const token = process.env.REACT_APP_TOKEN;
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : ""
    }
  };
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache()
});

const gitHubQuery = gql`
  query { 
  	user (login: "torvalds") {
    repositories(first: 100) {
      nodes {
      	id
        name
        updatedAt
        createdAt
        isPrivate
        url
      }
    }
  }
}
`;

class Repo extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			date: '',
			currentDate: new Date(),
		}
		this.getLiveDate = this.getLiveDate.bind(this);
	}

	componentDidMount() {
		this._isMounted = true;
		setInterval(this.getLiveDate, 10);
	}

	componentWillUnmount() {
		this._isMounted = false;
	}

	getLiveDate() {
		var date = this.state.currentDate - new Date(this.props.updatedAt);
		var years = Math.floor(date/3.154e+10);
		date = date - years*3.154e+10;
		var months = Math.floor(date/2.628e+9);
		date = date - months*2.628e+9;
		var days = Math.floor(date/8.64e+7);
		date = date - days*8.64e+7;
		var hours = Math.floor(date/3.6e+6);
		date = date - hours*3.6e+6;
		var minutes = Math.floor(date/60000);
		this._isMounted && this.setState({date: days + " дней, " + months + " месяцев, " + years + " лет, " + hours + " часов, " + minutes + " минут назад", currentDate: new Date()});
	}

	getDate(d) {
		return this.state.currentDate - new Date(d);
	}

	render () {
		return (
			<div className="Repo" href="#/">
				<li>{this.props.name}</li>
				<span>{"Последний апдейт: " + (this.getDate(this.props.updatedAt) < 60000 ? "только что" : this.getDate(this.props.updatedAt) < 3.6e+6 ? (Math.round(this.getDate(this.props.updatedAt) / 60000) + " минут назад") : this.getDate(this.props.updatedAt) < 8.64e+7 ? (Math.round(this.getDate(this.props.updatedAt) / 3.6e+6) + " часов назад") : this.state.date)}</span>
			</div>
		)
	}

}

class App extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			repos: [],
			query: gitHubQuery,
		}
	}

	liveSearch(e) {
		var newQuery = gql`
		query { 
			user(login: "${e.target.value !== "" ? e.target.value : "torvalds"}") {
				repositories(first: 100) {
					nodes {
						id
						name
						updatedAt
						createdAt
						isPrivate
						url
					}
				}
			}
		}
		`;
		client
		.query({
			query: gitHubQuery
		})
		.then(result => this.setState({query: newQuery}));
	}

	render () {
		return (
	    <ApolloProvider client={client}>
	      <div className="App">
	      <Link to={"/"}>
	      <input placeholder="Имя пользователя..." type="text" onKeyUp={(e) => this.liveSearch(e)}/>
	      </Link>
	        <Query query={this.state.query}>
	          {({ loading, error, data }) => (
	          	loading ? <p>Loading...</p> : error ? <p>Error...</p> :
	          	<Switch>
	                <Route path="/about/:id" component={({match}) => 
	                	data.user.repositories.nodes.find((el) => el.id === match.params.id) ?
                		<ul className="Page">
	                		<li onClick={() => this.liveSearch()}>
	                			<h3>Имя репозитория</h3>
	                			<h4>{data.user.repositories.nodes.find((el) => el.id === match.params.id).name}</h4>
	                		</li>
	                		<li>
	                			<h3>ID репозитория</h3>
	                			<h4>{data.user.repositories.nodes.find((el) => el.id === match.params.id).id}</h4>
	                		</li>
	                		<a href={data.user.repositories.nodes.find((el) => el.id === match.params.id).url}>
	                			<h3>URL репозитория</h3>
	                			<h4>{data.user.repositories.nodes.find((el) => el.id === match.params.id).url}</h4>
	                		</a>
	                		<li>
	                			<h3>Дата создания репозитория</h3>
	                			<h4>{new Date(data.user.repositories.nodes.find((el) => el.id === match.params.id).createdAt).toString().split(" GMT")[0]}</h4>
	                		</li>
	                		<li>
	                			<h3>Тип репозитория</h3>
	                			<h4>{data.user.repositories.nodes.find((el) => el.id === match.params.id).isPrivate ? "Закрытый" : "Публичный"}</h4>
	                		</li>
                		</ul> : null
	                } />
	                <Route path="/" exact component={() => 
	                	<section>
			          		{
								<ul>
									{
										data.user.repositories.nodes.map((el, i) => 
											<Link key={i} to={"/about/" + el.id}>
												<Repo name={el.name} updatedAt={el.updatedAt}></Repo>
											</Link>
											)
									}
								</ul>
			          		}
			          	</section>
	                } />
	            </Switch>
	          )}
	        </Query>
	      </div>
	    </ApolloProvider>
	  );
	}
}

const rootElement = document.getElementById("root");
ReactDOM.render(<BrowserRouter><App /></BrowserRouter>, rootElement);