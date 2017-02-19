package org.dixon.notify;

import org.springframework.data.repository.PagingAndSortingRepository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

/**
 * @author dickson
 */
@RepositoryRestResource(collectionResourceRel = "events", path = "events")
public interface PushEventRepository extends PagingAndSortingRepository<PushEvent, Long> {

}
