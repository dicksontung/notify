'use strict';

const React = require('react');
const ReactDOM = require('react-dom')
const when = require('when');
const client = require('./client');
const follow = require('./follow');
var stompClient = require('./websocket-listener')

const root = '/api';

class App extends React.Component {

    constructor(props) {
        super(props);
        this.state = {events: [], attributes: [], page: 1, pageSize: 5, links: {}};
        this.updatePageSize = this.updatePageSize.bind(this);
        this.onCreate = this.onCreate.bind(this);
        this.onUpdate = this.onUpdate.bind(this);
        this.onDelete = this.onDelete.bind(this);
        this.onNavigate = this.onNavigate.bind(this);
        this.refreshCurrentPage = this.refreshCurrentPage.bind(this);
        this.refreshAndGoToLastPage = this.refreshAndGoToLastPage.bind(this);
    }

    loadFromServer(pageSize) {
        follow(client, root, [
            {rel: 'events', params: {size: pageSize}}]
        ).then(eventCollection => {
            return client({
                              method: 'GET',
                              path: eventCollection.entity._links.profile.href,
                              headers: {'Accept': 'application/schema+json'}
                          }).then(schema => {
                this.schema = schema.entity;
                this.links = eventCollection.entity._links;
                return eventCollection;
            });
        }).then(eventCollection => {
            this.page = eventCollection.entity.page;
            return eventCollection.entity._embedded.events.map(event =>
                                                                   client({
                                                                              method: 'GET',
                                                                              path: event._links.self.href
                                                                          })
            );
        }).then(eventPromises => {
            return when.all(eventPromises);
        }).done(events => {
            this.setState({
                              page: this.page,
                              events: events,
                              attributes: Object.keys(this.schema.properties),
                              pageSize: pageSize,
                              links: this.links
                          });
        });
    }

    onCreate(newEvent) {
        follow(client, root, ['events']).done(response => {
            client({
                       method: 'POST',
                       path: response.entity._links.self.href,
                       entity: newEvent,
                       headers: {'Content-Type': 'application/json'}
                   })
        })
    }

    onUpdate(event, updatedEvent) {
        client({
                   method: 'PUT',
                   path: event.entity._links.self.href,
                   entity: updatedEvent,
                   headers: {
                       'Content-Type': 'application/json',
                       'If-Match': event.headers.Etag
                   }
               }).done(response => {
            /* Let the websocket handler update the state */
        }, response => {
            if (response.status.code === 412) {
                alert('DENIED: Unable to update ' +
                      event.entity._links.self.href + '. Your copy is stale.');
            }
        });
    }

    onDelete(event) {
        client({method: 'DELETE', path: event.entity._links.self.href});
    }

    onNavigate(navUri) {
        client({
                   method: 'GET',
                   path: navUri
               }).then(eventCollection => {
            this.links = eventCollection.entity._links;
            this.page = eventCollection.entity.page;

            return eventCollection.entity._embedded.events.map(event =>
                                                                   client({
                                                                              method: 'GET',
                                                                              path: event._links.self.href
                                                                          })
            );
        }).then(eventPromises => {
            return when.all(eventPromises);
        }).done(events => {
            this.setState({
                              page: this.page,
                              events: events,
                              attributes: Object.keys(this.schema.properties),
                              pageSize: this.state.pageSize,
                              links: this.links
                          });
        });
    }

    updatePageSize(pageSize) {
        if (pageSize !== this.state.pageSize) {
            this.loadFromServer(pageSize);
        }
    }

    refreshAndGoToLastPage(message) {
        follow(client, root, [{
            rel: 'events',
            params: {size: this.state.pageSize}
        }]).done(response => {
            if (response.entity._links.last !== undefined) {
                this.onNavigate(response.entity._links.last.href);
            } else {
                this.onNavigate(response.entity._links.self.href);
            }
        })
    }

    refreshCurrentPage(message) {
        follow(client, root, [{
            rel: 'events',
            params: {
                size: this.state.pageSize,
                page: this.state.page.number
            }
        }]).then(eventCollection => {
            this.links = eventCollection.entity._links;
            this.page = eventCollection.entity.page;

            return eventCollection.entity._embedded.events.map(event => {
                return client({
                                  method: 'GET',
                                  path: event._links.self.href
                              })
            });
        }).then(eventPromises => {
            return when.all(eventPromises);
        }).then(events => {
            this.setState({
                              page: this.page,
                              events: events,
                              attributes: Object.keys(this.schema.properties),
                              pageSize: this.state.pageSize,
                              links: this.links
                          });
        });
    }

    componentDidMount() {
        this.loadFromServer(this.state.pageSize);
        stompClient.register([
                                 {route: '/topic/newEvent', callback: this.refreshAndGoToLastPage},
                                 {route: '/topic/updateEvent', callback: this.refreshCurrentPage},
                                 {route: '/topic/deleteEvent', callback: this.refreshCurrentPage}
                             ]);
    }

    render() {
        return (
            <div>
                <EventList page={this.state.page}
                           events={this.state.events}
                           links={this.state.links}
                           pageSize={this.state.pageSize}
                           attributes={this.state.attributes}
                           onNavigate={this.onNavigate}
                           onUpdate={this.onUpdate}
                           onDelete={this.onDelete}
                           updatePageSize={this.updatePageSize}/>
                <CreateDialog attributes={this.state.attributes} onCreate={this.onCreate}/>
            </div>
        )
    }
}

class CreateDialog extends React.Component {

    constructor(props) {
        super(props);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleSubmit(e) {
        e.preventDefault();
        var newEvent = {};
        this.props.attributes.forEach(attribute => {
            if (typeof this.refs[attribute] !== 'undefined') {
                newEvent[attribute] = ReactDOM.findDOMNode(this.refs[attribute]).value.trim();
            }
        });
        this.props.onCreate(newEvent);

        this.props.attributes.forEach(attribute => {
            if (typeof this.refs[attribute] !== 'undefined') {
                ReactDOM.findDOMNode(this.refs[attribute]).value = '';
            }
        });

        window.location = "#";
    }

    render() {
        var attributes = this.props.attributes.filter(function (e) {
            if (e === "timestamp") {
                return false;
            }
            return true;
        })
        var inputs = attributes.map(attribute =>
                                                   <p key={attribute}>
                                                       <input type="text" placeholder={attribute}
                                                              ref={attribute} className="field"/>
                                                   </p>
        );

        return (
            <div>
                <a href="#pushEvent">Push</a>

                <div id="pushEvent" className="modalDialog">
                    <div>
                        <a href="#" title="Close" className="close">X</a>

                        <h2>Push a new event</h2>

                        <form>
                            {inputs}
                            <button onClick={this.handleSubmit}>Push</button>
                        </form>
                    </div>
                </div>
            </div>
        )
    }

}

class UpdateDialog extends React.Component {

    constructor(props) {
        super(props);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleSubmit(e) {
        e.preventDefault();
        var updatedEvent = {};
        this.props.attributes.forEach(attribute => {
            updatedEvent[attribute] = ReactDOM.findDOMNode(this.refs[attribute]).value.trim();
        });
        this.props.onUpdate(this.props.event, updatedEvent);
        window.location = "#";
    }

    render() {
        var inputs = this.props.attributes.map(attribute =>
                                                   <p key={this.props.event.entity[attribute]}>
                                                       <input type="text" placeholder={attribute}
                                                              defaultValue={this.props.event.entity[attribute]}
                                                              ref={attribute} className="field"/>
                                                   </p>
        );

        var dialogId = "updateEvent-" + this.props.event.entity._links.self.href;

        return (
            <div>
                <a href={"#" + dialogId}>Update</a>

                <div id={dialogId} className="modalDialog">
                    <div>
                        <a href="#" title="Close" className="close">X</a>

                        <h2>Update an event</h2>

                        <form>
                            {inputs}
                            <button onClick={this.handleSubmit}>Update</button>
                        </form>
                    </div>
                </div>
            </div>
        )
    }

}
;

class EventList extends React.Component {

    constructor(props) {
        super(props);
        this.handleNavFirst = this.handleNavFirst.bind(this);
        this.handleNavPrev = this.handleNavPrev.bind(this);
        this.handleNavNext = this.handleNavNext.bind(this);
        this.handleNavLast = this.handleNavLast.bind(this);
        this.handleInput = this.handleInput.bind(this);
    }

    handleInput(e) {
        e.preventDefault();
        var pageSize = ReactDOM.findDOMNode(this.refs.pageSize).value;
        if (/^[0-9]+$/.test(pageSize)) {
            this.props.updatePageSize(pageSize);
        } else {
            ReactDOM.findDOMNode(this.refs.pageSize).value =
                pageSize.substring(0, pageSize.length - 1);
        }
    }

    handleNavFirst(e) {
        e.preventDefault();
        this.props.onNavigate(this.props.links.first.href);
    }

    handleNavPrev(e) {
        e.preventDefault();
        this.props.onNavigate(this.props.links.prev.href);
    }

    handleNavNext(e) {
        e.preventDefault();
        this.props.onNavigate(this.props.links.next.href);
    }

    handleNavLast(e) {
        e.preventDefault();
        this.props.onNavigate(this.props.links.last.href);
    }

    render() {
        var pageInfo = this.props.page.hasOwnProperty("number") ?
                       <h3>Events - Page {this.props.page.number + 1}
                           of {this.props.page.totalPages}</h3> : null;

        var events = this.props.events.map(event =>
                                               <Event key={event.entity._links.self.href}
                                                      event={event}
                                                      attributes={this.props.attributes}
                                                      onUpdate={this.props.onUpdate}
                                                      onDelete={this.props.onDelete}/>
        );

        var navLinks = [];
        if ("first" in this.props.links) {
            navLinks.push(<button key="first" onClick={this.handleNavFirst}>&lt;&lt;</button>);
        }
        if ("prev" in this.props.links) {
            navLinks.push(<button key="prev" onClick={this.handleNavPrev}>&lt;</button>);
        }
        if ("next" in this.props.links) {
            navLinks.push(<button key="next" onClick={this.handleNavNext}>&gt;</button>);
        }
        if ("last" in this.props.links) {
            navLinks.push(<button key="last" onClick={this.handleNavLast}>&gt;&gt;</button>);
        }

        return (
            <div>
                {pageInfo}
                <table>
                    <tbody>
                    <tr>
                        <th>Time</th>
                        <th>Event Type</th>
                        <th>Event Description</th>
                        <th></th>
                    </tr>
                    {events}
                    </tbody>
                </table>
                <div>
                    {navLinks}
                </div>
            </div>
        )
    }
}

class Event extends React.Component {

    constructor(props) {
        super(props);
        this.handleDelete = this.handleDelete.bind(this);
    }

    handleDelete() {
        this.props.onDelete(this.props.event);
    }

    render() {
        return (
            <tr>
                <td>{this.props.event.entity.timestamp}</td>
                <td>{this.props.event.entity.eventType}</td>
                <td>{this.props.event.entity.eventDescription}</td>
                <td>
                    <button onClick={this.handleDelete}>Delete</button>
                </td>
            </tr>
        )
    }
}

ReactDOM.render(
    <App />,
    document.getElementById('react')
)