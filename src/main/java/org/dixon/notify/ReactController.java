package org.dixon.notify;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * @author dickson
 */
@Controller
public class ReactController {

  @RequestMapping(value = "/")
  public String index() {
    return "index";
  }
}
