package org.dixon.notify;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.rest.core.annotation.HandleAfterCreate;
import org.springframework.data.rest.core.annotation.HandleAfterDelete;
import org.springframework.data.rest.core.annotation.HandleAfterSave;
import org.springframework.data.rest.core.annotation.RepositoryEventHandler;
import org.springframework.hateoas.EntityLinks;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import static org.dixon.notify.WebSocketConfiguration.MESSAGE_PREFIX;

/**
 * @author dickson
 */
@Component
@RepositoryEventHandler(PushEvent.class)
public class PushEventHandler {

    private final SimpMessagingTemplate websocket;

    private final EntityLinks entityLinks;

    @Autowired
    public PushEventHandler(SimpMessagingTemplate websocket, EntityLinks entityLinks) {
        this.websocket = websocket;
        this.entityLinks = entityLinks;
    }

    @HandleAfterCreate
    public void newEvent(PushEvent pushEvent) {
        this.websocket.convertAndSend(
                MESSAGE_PREFIX + "/newEvent", getPath(pushEvent));
    }

    @HandleAfterDelete
    public void deleteEvent(PushEvent pushEvent) {
        this.websocket.convertAndSend(
                MESSAGE_PREFIX + "/deleteEvent", getPath(pushEvent));
    }

    @HandleAfterSave
    public void updateEvent(PushEvent pushEvent) {
        this.websocket.convertAndSend(
                MESSAGE_PREFIX + "/updateEvent", getPath(pushEvent));
    }

    /**
     * Take an {@link PushEvent} and get the URI using Spring Data REST's {@link EntityLinks}.
     *
     * @param pushEvent event
     */
    private String getPath(PushEvent pushEvent) {
        return this.entityLinks.linkForSingleResource(pushEvent.getClass(),
                pushEvent.getId()).toUri().getPath();
    }

}
