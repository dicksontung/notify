package org.dixon.notify;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * @author dickson
 */
@Component
public class DatabaseDemoLoader implements CommandLineRunner {

  private final PushEventRepository repository;

  @Autowired
  public DatabaseDemoLoader(PushEventRepository repository) {
    this.repository = repository;
  }

  @Override
  public void run(String... strings) throws Exception {
    this.repository.save(new PushEvent("ibg_ft_success",
        "IBG Transfer of RM8888 to Dickson on 19 Feb 2017 14:20:58 is successful."));
    this.repository.save(new PushEvent("auth_success", "authorization successful for trx"));
  }
}