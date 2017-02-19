package org.dixon.notify;

import com.fasterxml.jackson.annotation.JsonIgnore;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.ReadOnlyProperty;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.util.Date;

import javax.persistence.Entity;
import javax.persistence.EntityListeners;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Version;

@Entity
@EntityListeners(AuditingEntityListener.class)
public class PushEvent {

  @Id
  @GeneratedValue(strategy = GenerationType.AUTO)
  private long id;

  @CreatedDate
  @Temporal(TemporalType.TIMESTAMP)
  @ReadOnlyProperty
  private Date timestamp;
  private String eventType;
  private String eventDescription;

  @Version
  @JsonIgnore
  private Long version;

  public PushEvent() {}

  public PushEvent(String eventType, String eventDescription) {
    this.eventType = eventType;
    this.eventDescription = eventDescription;
  }

  public String getEventType() {
    return eventType;
  }

  public void setEventType(String eventType) {
    this.eventType = eventType;
  }

  public String getEventDescription() {
    return eventDescription;
  }

  public void setEventDescription(String eventDescription) {
    this.eventDescription = eventDescription;
  }

  public long getId() {
    return id;
  }

  public Date getTimestamp() {
    return timestamp;
  }
}
